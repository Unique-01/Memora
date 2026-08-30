import { FakeMemoryQueryInterpreter } from './fake-memory-query.interpreter';
import { validateMemoryQuery } from './memory-query.validator';
import type { MemoryQueryInterpreter } from './memory-query-interpreter.interface';

describe('MemoryQueryInterpreter & Boundary', () => {
  it('allows consuming the interpreter interface and swapping implementations', async () => {
    const interpreter: MemoryQueryInterpreter = new FakeMemoryQueryInterpreter({
      status: 'query',
      reason: null,
      query: { intent: 'WHO', searchTerm: 'charger', type: 'BORROWED' },
    });

    const result = await interpreter.interpret('Who has my charger?', {
      referenceTime: new Date().toISOString(),
    });

    expect(result.status).toBe('query');
    if (result.status === 'query') {
      expect(result.query.intent).toBe('WHO');
      expect(result.query.searchTerm).toBe('charger');
      expect(result.query.type).toBe('BORROWED');
    }
  });

  it.each(['FIND', 'WHO', 'WHERE', 'WHEN', 'RECENT'] as const)(
    'validates and accepts valid query result with intent %s',
    (intent) => {
      const raw = {
        status: 'query',
        reason: null,
        query: {
          intent,
          searchTerm: 'passport',
          type: 'STORED',
        },
      };

      const validated = validateMemoryQuery(raw);
      expect(validated).toEqual(raw);
    },
  );

  it('rejects unknown or malformed intent', () => {
    const raw = {
      status: 'query',
      reason: null,
      query: {
        intent: 'UNKNOWN_INTENT',
        searchTerm: 'passport',
        type: 'STORED',
      },
    };

    expect(() => validateMemoryQuery(raw)).toThrow();
  });

  it('validates and accepts unsupported query results', () => {
    const raw = {
      status: 'unsupported',
      reason: 'Not a memory query',
    };

    const validated = validateMemoryQuery(raw);
    expect(validated).toEqual(raw);
  });

  it('validates and accepts ambiguous query results', () => {
    const raw = {
      status: 'ambiguous',
      reason: 'Unclear what item is being queried',
    };

    const validated = validateMemoryQuery(raw);
    expect(validated).toEqual(raw);
  });

  it('rejects invalid or malformed query results', () => {
    expect(() => validateMemoryQuery(null)).toThrow();
    expect(() => validateMemoryQuery({ status: 'invalid' })).toThrow();
    expect(() =>
      validateMemoryQuery({ status: 'unsupported', reason: 123 }),
    ).toThrow();
    expect(() => validateMemoryQuery({ status: 'query', query: {} })).toThrow();
  });

  it('keeps unsupported and ambiguous results distinct', () => {
    const unsupported = validateMemoryQuery({
      status: 'unsupported',
      reason: 'foo',
    });
    const ambiguous = validateMemoryQuery({
      status: 'ambiguous',
      reason: 'bar',
    });

    expect(unsupported.status).toBe('unsupported');
    expect(ambiguous.status).toBe('ambiguous');
    expect(unsupported.status).not.toBe(ambiguous.status);
  });
});
