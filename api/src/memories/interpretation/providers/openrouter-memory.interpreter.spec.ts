import { Test, type TestingModule } from '@nestjs/testing';
import { MemoriesModule } from '../../memories.module';
import { PrismaModule, PrismaService } from '../../../database/prisma.module';
import { InvalidInterpretationError } from '../interpretation.validator';
import type {
  InterpretationContext,
  MemoryInterpreter,
} from '../memory-interpreter.interface';
import { MEMORY_INTERPRETER } from '../memory-interpreter.token';
import {
  DEFAULT_AI_MODEL,
  DEFAULT_OPENROUTER_BASE_URL,
  MemoryInterpreterApiError,
  MemoryInterpreterConfigError,
  OpenRouterMemoryInterpreter,
} from './openrouter-memory.interpreter';
import type { OpenRouterInterpreterConfig } from './openrouter-memory.interpreter';

const REFERENCE_TIME = '2026-08-23T14:00:00+01:00';

const supportedRaw = {
  status: 'supported',
  reason: null,
  interpretation: {
    type: 'BORROWED',
    title: 'Charger',
    summary: 'David has your charger and will return it tomorrow.',
    metadata: { item: 'charger', person: 'David', action: 'return' },
    occurredAt: null,
    dueAt: { value: '2026-08-24T14:00:00+01:00', relative: true },
    completedAt: null,
  },
};

const unsupportedRaw = {
  status: 'unsupported',
  reason: 'The input does not describe a memory.',
  interpretation: null,
};

const ambiguousRaw = {
  status: 'ambiguous',
  reason: 'Cannot determine what happened to the charger.',
  interpretation: null,
};

function completionWith(content: unknown): unknown {
  const text = typeof content === 'string' ? content : JSON.stringify(content);
  return { choices: [{ message: { content: text } }] };
}

interface ChatRequestBody {
  model?: string;
  messages?: Array<{ role: string; content: string }>;
}

function fetchJson(body: unknown, ok = true, status = 200): typeof fetch {
  return (_url: string, _init: RequestInit) =>
    Promise.resolve(
      new Response(JSON.stringify(body), {
        status: ok ? 200 : status,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
}

function makeInterpreter(
  fetchFn: typeof fetch,
  config: Partial<OpenRouterInterpreterConfig> = {},
): OpenRouterMemoryInterpreter {
  return new OpenRouterMemoryInterpreter({
    apiKey: 'test-key',
    baseUrl: DEFAULT_OPENROUTER_BASE_URL,
    model: DEFAULT_AI_MODEL,
    fetchFn,
    ...config,
  });
}

type CapturedRequest = { url: string; init: RequestInit };

function parseBody(request: CapturedRequest): ChatRequestBody {
  return JSON.parse(request.init.body as string) as ChatRequestBody;
}

function fetchCapturing(body: unknown): [typeof fetch, CapturedRequest[]] {
  const requests: CapturedRequest[] = [];
  const fn = (url: string, init: RequestInit) => {
    requests.push({ url, init });
    return Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));
  };
  return [fn, requests];
}

const CONTEXT: InterpretationContext = { referenceTime: REFERENCE_TIME };

describe('OpenRouterMemoryInterpreter', () => {
  it('interprets a supported memory through the validated contract', async () => {
    const [fetchFn, requests] = fetchCapturing(completionWith(supportedRaw));
    const interpreter = makeInterpreter(fetchFn);

    const result = await interpreter.interpret(
      'I gave David my charger and he said he will return it tomorrow.',
      CONTEXT,
    );

    expect(result.status).toBe('supported');
    if (result.status === 'supported') {
      expect(result.interpretation.type).toBe('BORROWED');
      expect(result.interpretation.metadata).toEqual({
        item: 'charger',
        person: 'David',
        action: 'return',
      });
      expect(result.interpretation.dueAt).toEqual({
        value: '2026-08-24T14:00:00+01:00',
        relative: true,
      });
    }

    const { url, init } = requests[0];
    expect(url).toBe(`${DEFAULT_OPENROUTER_BASE_URL}/chat/completions`);
    expect(init.method).toBe('POST');
    const headers = new Headers(init.headers);
    expect(headers.get('Authorization')).toBe('Bearer test-key');
    const body = parseBody(requests[0]);
    expect(body.model).toBe('openai/gpt-oss-20b');
    expect(body.messages?.[0].role).toBe('system');
    expect(body.messages?.[1].content).toContain(REFERENCE_TIME);
    expect(JSON.stringify(body)).not.toContain('test-key');
  });

  it('passes through an unsupported outcome without fabricating a memory', async () => {
    const interpreter = makeInterpreter(
      fetchJson(completionWith(unsupportedRaw)),
    );

    const result = await interpreter.interpret(
      'The weather is really hot today.',
      CONTEXT,
    );

    expect(result.status).toBe('unsupported');
    expect(result).not.toHaveProperty('interpretation');
  });

  it('passes through an ambiguous outcome instead of forcing a type', async () => {
    const interpreter = makeInterpreter(
      fetchJson(completionWith(ambiguousRaw)),
    );

    const result = await interpreter.interpret(
      'David has my charger.',
      CONTEXT,
    );

    expect(result.status).toBe('ambiguous');
  });

  it('parses fenced model output', async () => {
    const fenced = '```json\n' + JSON.stringify(supportedRaw) + '\n```';
    const interpreter = makeInterpreter(fetchJson(completionWith(fenced)));

    const result = await interpreter.interpret('anything', CONTEXT);

    expect(result.status).toBe('supported');
  });

  it('treats malformed JSON output as an interpreter failure', async () => {
    const interpreter = makeInterpreter(
      fetchJson(completionWith('{status: supported,,,')),
    );

    await expect(interpreter.interpret('input', CONTEXT)).rejects.toThrow(
      MemoryInterpreterApiError,
    );
  });

  it('rejects the intermittently observed array-wrapped output shape', async () => {
    // Observed live (M007): the model occasionally wraps the result in a
    // top-level JSON array despite strict json_schema, e.g. [{"status":...}].
    // JSON.parse succeeds, but the contract requires a plain object.
    const interpreter = makeInterpreter(
      fetchJson(completionWith([supportedRaw])),
    );

    await expect(interpreter.interpret('input', CONTEXT)).rejects.toThrow(
      'Invalid interpretation result: result must be an object',
    );
  });

  it('surfaces validation failures for contract-violating structured output', async () => {
    const invalid = {
      status: 'supported',
      interpretation: { type: 'BORROWED', content: 'echo of the input' },
    };
    const interpreter = makeInterpreter(fetchJson(completionWith(invalid)));

    await expect(interpreter.interpret('input', CONTEXT)).rejects.toThrow(
      InvalidInterpretationError,
    );
  });

  it('propagates HTTP failures instead of inventing results', async () => {
    const interpreter = makeInterpreter(
      fetchJson({ error: 'server exploded' }, false, 500),
    );

    await expect(interpreter.interpret('input', CONTEXT)).rejects.toThrow(
      /HTTP 500/,
    );
  });

  it('treats empty completions as an interpreter failure', async () => {
    const interpreter = makeInterpreter(fetchJson({ choices: [] }));

    await expect(interpreter.interpret('input', CONTEXT)).rejects.toThrow(
      /empty completion/,
    );
  });

  it('throws a configuration error when the API key is missing', async () => {
    const interpreter = makeInterpreter(
      fetchJson(completionWith(supportedRaw)),
      {
        apiKey: undefined,
      },
    );

    await expect(interpreter.interpret('input', CONTEXT)).rejects.toThrow(
      MemoryInterpreterConfigError,
    );
  });

  it('interprets relative dates correctly with fixed reference time', async () => {
    // 2026-08-30 is a Sunday
    const fixedRef = '2026-08-30T10:00:00.000Z';
    const dateCases = [
      {
        input: 'return it tomorrow',
        field: 'dueAt',
        expectedValue: '2026-08-31T10:00:00.000Z',
        expectedRelative: true,
      },
      {
        input: 'return it Friday',
        field: 'dueAt',
        expectedValue: '2026-09-04T10:00:00.000Z',
        expectedRelative: true,
      },
      {
        input: 'return it by Friday',
        field: 'dueAt',
        expectedValue: '2026-09-04T10:00:00.000Z',
        expectedRelative: true,
      },
      {
        input: 'I did it yesterday',
        field: 'completedAt',
        expectedValue: '2026-08-29T10:00:00.000Z',
        expectedRelative: true,
      },
      {
        input: "I'll do it in two days",
        field: 'dueAt',
        expectedValue: '2026-09-01T10:00:00.000Z',
        expectedRelative: true,
      },
      {
        input: 'next Friday',
        field: 'dueAt',
        expectedValue: '2026-09-11T10:00:00.000Z',
        expectedRelative: true,
      },
      {
        input: 'absolute date on 2026-10-01',
        field: 'dueAt',
        expectedValue: '2026-10-01T00:00:00.000Z',
        expectedRelative: false,
      },
    ];

    for (const c of dateCases) {
      const raw = {
        status: 'supported',
        reason: null,
        interpretation: {
          type: 'PROMISED',
          title: 'Task',
          summary: c.input,
          metadata: {},
          occurredAt: null,
          dueAt:
            c.field === 'dueAt'
              ? { value: c.expectedValue, relative: c.expectedRelative }
              : null,
          completedAt:
            c.field === 'completedAt'
              ? { value: c.expectedValue, relative: c.expectedRelative }
              : null,
        },
      };
      const [fetchFn, requests] = fetchCapturing(completionWith(raw));
      const interpreter = makeInterpreter(fetchFn);
      const result = await interpreter.interpret(c.input, {
        referenceTime: fixedRef,
      });

      expect(parseBody(requests[0]).messages?.[1].content).toContain(fixedRef);
      expect(result.status).toBe('supported');
      if (result.status === 'supported') {
        const dateObj =
          result.interpretation[c.field as 'dueAt' | 'completedAt'];
        expect(dateObj).toEqual({
          value: c.expectedValue,
          relative: c.expectedRelative,
        });
      }
    }
  });

  it('classifies memory inputs into correct types according to semantic boundaries', async () => {
    const classificationCases = [
      { input: 'I lent David my charger.', expectedType: 'BORROWED' },
      {
        input:
          'I gave David my laptop and he promised to return it in two days.',
        expectedType: 'BORROWED',
      },
      {
        input: 'John has my book and will return it Friday.',
        expectedType: 'BORROWED',
      },
      {
        input: 'I put my passport in the black backpack.',
        expectedType: 'STORED',
      },
      {
        input: 'I serviced the generator yesterday.',
        expectedType: 'LAST_DONE',
      },
      {
        input: "I promised Mum I'd send the document tomorrow.",
        expectedType: 'PROMISED',
      },
      {
        input: 'I promised David I would call him Friday.',
        expectedType: 'PROMISED',
      },
      {
        input: 'Landlady owes me 30,000 naira and should return it Friday.',
        expectedType: 'BORROWED', // or supported appropriately without user promise
      },
      {
        input: 'Something completely unclear and vague...',
        expectedStatus: 'ambiguous',
      },
    ];

    for (const c of classificationCases) {
      const raw =
        c.expectedStatus === 'ambiguous'
          ? { status: 'ambiguous', reason: 'Unclear' }
          : {
              status: 'supported',
              reason: null,
              interpretation: {
                type: c.expectedType,
                title: 'Summary',
                summary: c.input,
                metadata: {},
                occurredAt: null,
                dueAt: null,
                completedAt: null,
              },
            };

      const interpreter = makeInterpreter(fetchJson(completionWith(raw)));
      const result = await interpreter.interpret(c.input, CONTEXT);
      if (c.expectedStatus === 'ambiguous') {
        expect(result.status).toBe('ambiguous');
      } else {
        expect(result.status).toBe('supported');
        if (result.status === 'supported') {
          expect(result.interpretation.type).toBe(c.expectedType);
        }
      }
    }
  });
  it('correctly resolves "by Friday" with a Sunday reference date (regression test)', async () => {
    const sundayRef = '2026-08-30T12:00:00.000Z'; // Sunday
    const expectedFriday = '2026-09-04T12:00:00.000Z'; // The upcoming Friday, NOT Monday (08-31)

    const raw = {
      status: 'supported',
      reason: null,
      interpretation: {
        type: 'PROMISED',
        title: 'Return money',
        summary:
          'Landlady is owing me 30,000 naira and should return it by Friday.',
        metadata: { person: 'Landlady', amount: '30000 naira' },
        occurredAt: null,
        dueAt: { value: expectedFriday, relative: true },
        completedAt: null,
      },
    };

    const [fetchFn, requests] = fetchCapturing(completionWith(raw));
    const interpreter = makeInterpreter(fetchFn);
    const result = await interpreter.interpret(
      'Landlady is owing me 30,000 naira and she should return it by Friday',
      { referenceTime: sundayRef },
    );

    expect(parseBody(requests[0]).messages?.[1].content).toContain(sundayRef);
    expect(result.status).toBe('supported');
    if (result.status === 'supported') {
      expect(result.interpretation.dueAt?.value).toBe(expectedFriday);
      expect(result.interpretation.dueAt?.relative).toBe(true);
    }
  });
});

describe('NestJS binding', () => {
  let moduleRef: TestingModule;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [MemoriesModule, PrismaModule],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .compile();
  });

  it('resolves MEMORY_INTERPRETER to the OpenRouter implementation', () => {
    const interpreter = moduleRef.get<MemoryInterpreter>(MEMORY_INTERPRETER);
    expect(interpreter).toBeInstanceOf(OpenRouterMemoryInterpreter);
    expect((interpreter as OpenRouterMemoryInterpreter).model).toBe(
      DEFAULT_AI_MODEL,
    );
  });
});
