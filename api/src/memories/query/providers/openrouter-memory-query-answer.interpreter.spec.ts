import {
  OpenRouterMemoryQueryAnswerer,
  MemoryQueryAnswerConfigError,
  MemoryQueryAnswerApiError,
} from './openrouter-memory-query-answer.interpreter';
import type { Memory } from '../../../generated/prisma/client';

describe('OpenRouterMemoryQueryAnswerer', () => {
  const apiKey = 'test-api-key';

  const sampleMemory: Memory = {
    id: 'mem-1',
    type: 'BORROWED',
    title: 'Charger',
    summary: 'David has my charger',
    content: 'I gave David my charger.',
    metadata: { person: 'David' },
    occurredAt: null,
    dueAt: null,
    completedAt: null,
    createdAt: new Date('2026-08-28T00:00:00.000Z'),
    updatedAt: new Date('2026-08-28T00:00:00.000Z'),
  };

  function mockFetch(status: number, body: unknown): typeof fetch {
    return jest.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(body),
    });
  }

  it('throws MemoryQueryAnswerConfigError when API key is missing', async () => {
    const answerer = new OpenRouterMemoryQueryAnswerer({ apiKey: '' });
    await expect(
      answerer.answer('Who has my charger?', [sampleMemory]),
    ).rejects.toThrow(MemoryQueryAnswerConfigError);
  });

  it('successfully returns a grounded answer', async () => {
    const fetchFn = mockFetch(200, {
      choices: [
        {
          message: {
            content: JSON.stringify({
              answer: 'Your charger is with David.',
            }),
          },
        },
      ],
    });

    const answerer = new OpenRouterMemoryQueryAnswerer({
      apiKey,
      fetchFn,
    });

    const result = await answerer.answer('Who has my charger?', [sampleMemory]);

    expect(result).toEqual({ answer: 'Your charger is with David.' });
    expect(fetchFn).toHaveBeenCalledTimes(1);

    const call = (fetchFn as jest.Mock).mock.calls[0] as [
      string,
      RequestInit & { headers: Record<string, string> },
    ];
    const options = call[1];
    expect(options.headers.Authorization).toBe(`Bearer ${apiKey}`);
    expect(options.body).not.toContain(apiKey);
    expect(options.body).toContain('Who has my charger?');
    expect(options.body).toContain('David has my charger');
  });

  it('rejects malformed response or empty answers', async () => {
    const fetchFn = mockFetch(200, {
      choices: [
        {
          message: {
            content: JSON.stringify({ answer: '   ' }),
          },
        },
      ],
    });

    const answerer = new OpenRouterMemoryQueryAnswerer({
      apiKey,
      fetchFn,
    });

    await expect(
      answerer.answer('Who has my charger?', [sampleMemory]),
    ).rejects.toThrow();
  });

  it('propagates HTTP failures', async () => {
    const fetchFn = mockFetch(500, { error: 'Internal Server Error' });
    const answerer = new OpenRouterMemoryQueryAnswerer({
      apiKey,
      fetchFn,
    });

    await expect(
      answerer.answer('Who has my charger?', [sampleMemory]),
    ).rejects.toThrow(MemoryQueryAnswerApiError);
  });
});
