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

  it('allows changing the model through configuration only', async () => {
    const [fetchFn, requests] = fetchCapturing(completionWith(supportedRaw));
    const interpreter = makeInterpreter(fetchFn, { model: 'other/model' });

    await interpreter.interpret('input', CONTEXT);

    expect(parseBody(requests[0]).model).toBe('other/model');
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
