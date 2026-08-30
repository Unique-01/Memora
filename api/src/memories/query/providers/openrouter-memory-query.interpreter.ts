import { validateMemoryQuery } from '../memory-query.validator';
import type { MemoryQueryInterpreter } from '../memory-query-interpreter.interface';
import type {
  MemoryQueryResult,
  QueryInterpretationContext,
} from '../memory-query.types';
import {
  buildQueryUserMessage,
  OPENROUTER_QUERY_SYSTEM_PROMPT,
} from './openrouter-memory-query.prompt';

export const DEFAULT_OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
export const DEFAULT_AI_MODEL = 'openai/gpt-oss-20b';

/** Thrown when the query interpreter is used without required configuration. */
export class MemoryQueryInterpreterConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MemoryQueryInterpreterConfigError';
  }
}

/** Thrown when the OpenRouter request fails or returns an unusable response. */
export class MemoryQueryInterpreterApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'MemoryQueryInterpreterApiError';
  }
}

export interface OpenRouterQueryInterpreterConfig {
  apiKey?: string;
  model?: string;
  baseUrl?: string;
  fetchFn?: typeof fetch;
  timeoutMs?: number;
}

interface ChatCompletionPayload {
  choices?: Array<{ message?: { content?: string | null } }>;
}

const RESULT_JSON_SCHEMA = {
  type: 'object',
  properties: {
    status: { type: 'string', enum: ['query', 'unsupported', 'ambiguous'] },
    reason: { type: ['string', 'null'] },
    query: {
      type: ['object', 'null'],
      properties: {
        intent: {
          type: 'string',
          enum: ['FIND', 'WHO', 'WHERE', 'WHEN', 'RECENT'],
        },
        searchTerm: { type: ['string', 'null'] },
        type: {
          type: ['string', 'null'],
          enum: ['BORROWED', 'STORED', 'LAST_DONE', 'PROMISED', null],
        },
      },
      required: ['intent', 'searchTerm', 'type'],
      additionalProperties: false,
    },
  },
  required: ['status', 'reason', 'query'],
  additionalProperties: false,
} as const;

function stripCodeFence(content: string): string {
  const trimmed = content.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/.exec(trimmed);
  return (fenced ? fenced[1] : trimmed).trim();
}

/**
 * `MemoryQueryInterpreter` backed by OpenRouter's chat-completions API using the
 * configured model. Knows nothing about Prisma, persistence, or NestJS.
 */
export class OpenRouterMemoryQueryInterpreter implements MemoryQueryInterpreter {
  private readonly fetchFn: typeof fetch;
  private readonly timeoutMs: number;

  constructor(private readonly config: OpenRouterQueryInterpreterConfig) {
    this.fetchFn = config.fetchFn ?? globalThis.fetch.bind(globalThis);
    this.timeoutMs = config.timeoutMs ?? 30_000;
  }

  /** Environment-backed instance for the composition root. */
  static fromEnv(
    env: NodeJS.ProcessEnv = process.env,
  ): OpenRouterMemoryQueryInterpreter {
    return new OpenRouterMemoryQueryInterpreter({
      apiKey: env.OPENROUTER_API_KEY,
      model: env.AI_MODEL ?? DEFAULT_AI_MODEL,
      baseUrl: env.OPENROUTER_BASE_URL ?? DEFAULT_OPENROUTER_BASE_URL,
    });
  }

  get model(): string {
    return this.config.model ?? DEFAULT_AI_MODEL;
  }

  async interpret(
    input: string,
    context: QueryInterpretationContext,
  ): Promise<MemoryQueryResult> {
    if (!this.config.apiKey) {
      throw new MemoryQueryInterpreterConfigError(
        'OPENROUTER_API_KEY is not configured; cannot run memory query interpretation.',
      );
    }

    let response: Response;
    try {
      response = await this.fetchFn(`${this.baseUrl()}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: OPENROUTER_QUERY_SYSTEM_PROMPT },
            {
              role: 'user',
              content: buildQueryUserMessage(input, context.referenceTime),
            },
          ],
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'memory_query_result',
              strict: true,
              schema: RESULT_JSON_SCHEMA,
            },
          },
          temperature: 0,
        }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      throw new MemoryQueryInterpreterApiError(
        `OpenRouter request failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    if (!response.ok) {
      throw new MemoryQueryInterpreterApiError(
        `OpenRouter request failed with HTTP ${response.status}`,
        response.status,
      );
    }

    let payload: ChatCompletionPayload;
    try {
      payload = (await response.json()) as ChatCompletionPayload;
    } catch {
      throw new MemoryQueryInterpreterApiError(
        'OpenRouter returned a non-JSON body',
      );
    }

    const content = payload.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || content.trim().length === 0) {
      throw new MemoryQueryInterpreterApiError(
        'OpenRouter returned an empty completion',
      );
    }

    let raw: unknown;
    try {
      raw = JSON.parse(stripCodeFence(content));
    } catch {
      throw new MemoryQueryInterpreterApiError(
        'Model output is not valid JSON',
      );
    }

    return validateMemoryQuery(raw);
  }

  private baseUrl(): string {
    return (this.config.baseUrl ?? DEFAULT_OPENROUTER_BASE_URL).replace(
      /\/+$/,
      '',
    );
  }
}
