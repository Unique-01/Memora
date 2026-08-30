import {
  OpenRouterMemoryQueryInterpreter,
  MemoryQueryInterpreterConfigError,
  MemoryQueryInterpreterApiError,
} from './openrouter-memory-query.interpreter';

describe('OpenRouterMemoryQueryInterpreter', () => {
  const apiKey = 'test-api-key';
  const referenceTime = '2026-08-28T12:00:00.000Z';

  function mockFetch(status: number, body: unknown): typeof fetch {
    return jest.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(body),
    });
  }

  it('throws MemoryQueryInterpreterConfigError when API key is missing', async () => {
    const interpreter = new OpenRouterMemoryQueryInterpreter({ apiKey: '' });
    await expect(
      interpreter.interpret('Where is my passport?', { referenceTime }),
    ).rejects.toThrow(MemoryQueryInterpreterConfigError);
  });

  it.each(['FIND', 'WHO', 'WHERE', 'WHEN', 'RECENT'] as const)(
    'accepts valid intent %s',
    async (intent) => {
      const fetchFn = mockFetch(200, {
        choices: [
          {
            message: {
              content: JSON.stringify({
                status: 'query',
                reason: null,
                query: { intent, searchTerm: 'test', type: 'STORED' },
              }),
            },
          },
        ],
      });

      const interpreter = new OpenRouterMemoryQueryInterpreter({
        apiKey,
        fetchFn,
      });

      const result = await interpreter.interpret('test question', {
        referenceTime,
      });

      expect(result).toEqual({
        status: 'query',
        reason: null,
        query: { intent, searchTerm: 'test', type: 'STORED' },
      });
    },
  );

  it('successfully interprets a query without a type', async () => {
    const fetchFn = mockFetch(200, {
      choices: [
        {
          message: {
            content: JSON.stringify({
              status: 'query',
              reason: null,
              query: { intent: 'WHO', searchTerm: 'charger', type: null },
            }),
          },
        },
      ],
    });

    const interpreter = new OpenRouterMemoryQueryInterpreter({
      apiKey,
      fetchFn,
    });

    const result = await interpreter.interpret('Who has my charger?', {
      referenceTime,
    });

    expect(result).toEqual({
      status: 'query',
      reason: null,
      query: { intent: 'WHO', searchTerm: 'charger', type: null },
    });
  });

  it('handles unsupported result', async () => {
    const fetchFn = mockFetch(200, {
      choices: [
        {
          message: {
            content: JSON.stringify({
              status: 'unsupported',
              reason: 'Not a memory query',
              query: null,
            }),
          },
        },
      ],
    });

    const interpreter = new OpenRouterMemoryQueryInterpreter({
      apiKey,
      fetchFn,
    });

    const result = await interpreter.interpret('What is the weather?', {
      referenceTime,
    });

    expect(result).toEqual({
      status: 'unsupported',
      reason: 'Not a memory query',
    });
  });

  it('handles ambiguous result', async () => {
    const fetchFn = mockFetch(200, {
      choices: [
        {
          message: {
            content: JSON.stringify({
              status: 'ambiguous',
              reason: 'Too vague',
              query: null,
            }),
          },
        },
      ],
    });

    const interpreter = new OpenRouterMemoryQueryInterpreter({
      apiKey,
      fetchFn,
    });

    const result = await interpreter.interpret('Where is it?', {
      referenceTime,
    });

    expect(result).toEqual({
      status: 'ambiguous',
      reason: 'Too vague',
    });
  });

  it('handles malformed JSON', async () => {
    const fetchFn = mockFetch(200, {
      choices: [{ message: { content: 'not valid json' } }],
    });

    const interpreter = new OpenRouterMemoryQueryInterpreter({
      apiKey,
      fetchFn,
    });

    await expect(
      interpreter.interpret('Where is my passport?', { referenceTime }),
    ).rejects.toThrow(MemoryQueryInterpreterApiError);
  });

  it('handles contract-invalid response', async () => {
    const fetchFn = mockFetch(200, {
      choices: [
        {
          message: {
            content: JSON.stringify({
              status: 'unknown_status',
            }),
          },
        },
      ],
    });

    const interpreter = new OpenRouterMemoryQueryInterpreter({
      apiKey,
      fetchFn,
    });

    await expect(
      interpreter.interpret('Where is my passport?', { referenceTime }),
    ).rejects.toThrow();
  });

  it('handles HTTP failure', async () => {
    const fetchFn = mockFetch(500, { error: 'Internal Server Error' });

    const interpreter = new OpenRouterMemoryQueryInterpreter({
      apiKey,
      fetchFn,
    });

    await expect(
      interpreter.interpret('Where is my passport?', { referenceTime }),
    ).rejects.toThrow(MemoryQueryInterpreterApiError);
  });

  it('handles empty completion', async () => {
    const fetchFn = mockFetch(200, { choices: [{ message: { content: '' } }] });

    const interpreter = new OpenRouterMemoryQueryInterpreter({
      apiKey,
      fetchFn,
    });

    await expect(
      interpreter.interpret('Where is my passport?', { referenceTime }),
    ).rejects.toThrow(MemoryQueryInterpreterApiError);
  });

  it('respects custom AI_MODEL configuration', () => {
    const interpreter = new OpenRouterMemoryQueryInterpreter({
      apiKey,
      model: 'anthropic/claude-3.5-sonnet',
    });
    expect(interpreter.model).toBe('anthropic/claude-3.5-sonnet');
  });

  it('reads model from environment correctly in fromEnv', () => {
    const env = {
      OPENROUTER_API_KEY: 'env-key',
      AI_MODEL: 'openai/gpt-4o',
      OPENROUTER_BASE_URL: 'https://custom.base/v1',
    };
    const interpreter = OpenRouterMemoryQueryInterpreter.fromEnv(env);
    expect(interpreter.model).toBe('openai/gpt-4o');
  });
});
