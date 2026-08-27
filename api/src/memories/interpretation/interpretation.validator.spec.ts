import {
  InvalidInterpretationError,
  validateInterpretationResult,
} from './interpretation.validator';
import type { MemoryInterpretationResult } from './memory-interpretation.types';
import type {
  InterpretationContext,
  MemoryInterpreter,
} from './memory-interpreter.interface';

/**
 * Fixed reference time used by every test. Relative dates below are resolved
 * against THIS value, never against the test runner's current time.
 */
const REFERENCE_TIME = '2026-08-23T14:00:00+01:00';

function addDays(iso: string, days: number): string {
  const resolved = new Date(
    new Date(iso).getTime() + days * 24 * 60 * 60 * 1000,
  );
  return resolved.toISOString();
}

describe('interpretation contract validation', () => {
  describe('supported memories', () => {
    it('accepts a STORED interpretation grounded in the input', () => {
      const raw = {
        status: 'supported',
        interpretation: {
          // "I put my passport in the black backpack."
          type: 'STORED',
          title: 'Passport',
          summary: 'Your passport is in the black backpack.',
          metadata: { item: 'passport', location: 'black backpack' },
          occurredAt: null,
          dueAt: null,
          completedAt: null,
        },
      };

      const result = validateInterpretationResult(raw);

      expect(result).toEqual(raw);
      if (result.status === 'supported') {
        expect(result.interpretation.metadata).toEqual({
          item: 'passport',
          location: 'black backpack',
        });
        expect(result.interpretation.dueAt).toBeNull();
      }
    });

    it('accepts a BORROWED interpretation with a due date resolved from the reference time', () => {
      const raw = {
        status: 'supported',
        interpretation: {
          // "I gave David my charger and he'll return it Friday."
          // Reference time is Sunday 2026-08-23; "Friday" resolves to 2026-08-28.
          type: 'BORROWED',
          title: 'Charger',
          summary: 'David has your charger and will return it on Friday.',
          metadata: { item: 'charger', person: 'David', action: 'return' },
          occurredAt: { value: REFERENCE_TIME, relative: false },
          dueAt: { value: '2026-08-28T14:00:00+01:00', relative: true },
          completedAt: null,
        },
      };

      const result = validateInterpretationResult(raw);

      expect(result.status).toBe('supported');
      if (result.status === 'supported') {
        expect(result.interpretation.type).toBe('BORROWED');
        expect(result.interpretation.dueAt).toEqual({
          value: '2026-08-28T14:00:00+01:00',
          relative: true,
        });
        expect(addDays(REFERENCE_TIME, 5)).toBe('2026-08-28T13:00:00.000Z');
      }
    });

    it('preserves a BORROWED interpretation without inventing a due date', () => {
      // "I gave David my charger." — nothing supports a return date.
      const raw = {
        status: 'supported',
        interpretation: {
          type: 'BORROWED',
          title: 'Charger',
          summary: 'You gave your charger to David.',
          metadata: { item: 'charger', person: 'David', action: 'give' },
          occurredAt: null,
          dueAt: null,
          completedAt: null,
        },
      };

      const result = validateInterpretationResult(raw);

      expect(result.status).toBe('supported');
      if (result.status === 'supported') {
        expect(result.interpretation.type).toBe('BORROWED');
        expect(result.interpretation.dueAt).toBeNull();
      }
    });

    it('keeps flexible nested JSON metadata', () => {
      const raw = {
        status: 'supported',
        interpretation: {
          type: 'LAST_DONE',
          title: 'Generator servicing',
          summary: 'The generator was serviced yesterday.',
          metadata: {
            item: 'generator',
            history: [{ done: true }, { note: null }],
            details: { place: 'garage' },
          },
          occurredAt: { value: '2026-08-22T09:00:00+01:00', relative: true },
          dueAt: null,
          completedAt: null,
        },
      };

      expect(() => validateInterpretationResult(raw)).not.toThrow();
    });
  });

  describe('unsupported and ambiguous input', () => {
    it('represents input that does not describe a supported memory', () => {
      // "The weather is really hot today."
      const result = validateInterpretationResult({
        status: 'unsupported',
        reason: 'No memory-related statement found.',
      });

      expect(result.status).toBe('unsupported');
      if (result.status === 'unsupported') {
        expect(result.reason).toContain('No memory');
      }
      expect(result).not.toHaveProperty('interpretation');
    });

    it('represents ambiguous input instead of guessing a type or facts', () => {
      // "David has my charger." — may be BORROWED, but ownership/borrowing
      // cannot be safely determined; nothing beyond the input is invented.
      const raw = {
        status: 'ambiguous',
        reason: 'Could not determine what happened to the charger.',
      };

      const result = validateInterpretationResult(raw);

      expect(result).toEqual({ status: 'ambiguous', reason: raw.reason });
    });

    it('rejects a "supported" result without a concrete memory type', () => {
      expect(() =>
        validateInterpretationResult({
          status: 'supported',
          interpretation: {
            type: null,
            title: 'Something happened',
            summary: null,
            metadata: {},
            occurredAt: null,
            dueAt: null,
            completedAt: null,
          },
        }),
      ).toThrow(InvalidInterpretationError);
    });
  });

  describe('contract violations', () => {
    it('rejects interpretations that emit the original content', () => {
      expect(() =>
        validateInterpretationResult({
          status: 'supported',
          interpretation: {
            type: 'STORED',
            title: 'Passport',
            summary: 'Passport stored.',
            content: 'I put my passport in the black backpack.',
            metadata: {},
            occurredAt: null,
            dueAt: null,
            completedAt: null,
          },
        }),
      ).toThrow(/unexpected interpretation keys: content/);
    });

    it('rejects unknown memory types', () => {
      expect(() =>
        validateInterpretationResult({
          status: 'supported',
          interpretation: {
            type: 'REMINDER',
            title: 'x',
            summary: null,
            metadata: {},
            occurredAt: null,
            dueAt: null,
            completedAt: null,
          },
        }),
      ).toThrow(/type must be one of/);
    });

    it('rejects non-object or non-JSON-compatible metadata', () => {
      const base = {
        type: 'STORED',
        title: 'x',
        summary: null,
        occurredAt: null,
        dueAt: null,
        completedAt: null,
      };

      expect(() =>
        validateInterpretationResult({
          status: 'supported',
          interpretation: { ...base, metadata: ['not', 'an', 'object'] },
        }),
      ).toThrow(InvalidInterpretationError);

      expect(() =>
        validateInterpretationResult({
          status: 'supported',
          interpretation: { ...base, metadata: { when: new Date() } },
        }),
      ).toThrow(/metadata\.when is not JSON-compatible/);
    });

    it('rejects malformed date values', () => {
      const base = {
        type: 'PROMISED',
        title: 'x',
        summary: null,
        metadata: {},
        occurredAt: null,
        completedAt: null,
      };

      expect(() =>
        validateInterpretationResult({
          status: 'supported',
          interpretation: {
            ...base,
            dueAt: { value: 'tomorrow', relative: true },
          },
        }),
      ).toThrow(/dueAt\.value must be an ISO 8601 date-time string/);

      expect(() =>
        validateInterpretationResult({
          status: 'supported',
          interpretation: { ...base, dueAt: { value: '2026-08-25T10:00:00Z' } },
        }),
      ).toThrow(/dueAt\.relative must be a boolean/);
    });

    it('rejects invalid statuses and non-object payloads', () => {
      expect(() => validateInterpretationResult({ status: 'maybe' })).toThrow(
        /status must be one of/,
      );
      expect(() => validateInterpretationResult('BORROWED')).toThrow(
        InvalidInterpretationError,
      );
      expect(() => validateInterpretationResult(null)).toThrow(
        InvalidInterpretationError,
      );
    });

    it('rejects empty titles and non-string reasons', () => {
      expect(() =>
        validateInterpretationResult({
          status: 'supported',
          interpretation: {
            type: 'STORED',
            title: '   ',
            summary: null,
            metadata: {},
            occurredAt: null,
            dueAt: null,
            completedAt: null,
          },
        }),
      ).toThrow(/title must be a non-empty string or null/);

      expect(() =>
        validateInterpretationResult({ status: 'ambiguous', reason: 42 }),
      ).toThrow(InvalidInterpretationError);
    });
  });
});

describe('MemoryInterpreter interface usage', () => {
  /**
   * Fixture demonstrating how the application consumes any interpreter:
   * through the interface only, with output validated before use.
   */
  class StubInterpreter implements MemoryInterpreter {
    constructor(private readonly result: unknown) {}

    interpret(
      _input: string,
      _context: InterpretationContext,
    ): Promise<MemoryInterpretationResult> {
      return Promise.resolve().then(() =>
        validateInterpretationResult(this.result),
      );
    }
  }

  it('lets the application depend on the interface and validated results only', async () => {
    const interpreter: MemoryInterpreter = new StubInterpreter({
      status: 'supported',
      interpretation: {
        type: 'STORED',
        title: 'Passport',
        summary: 'Passport is in the black backpack.',
        metadata: { item: 'passport', location: 'black backpack' },
        occurredAt: null,
        dueAt: null,
        completedAt: null,
      },
    });

    const result = await interpreter.interpret(
      'I put my passport in the black backpack.',
      { referenceTime: REFERENCE_TIME },
    );

    expect(result.status).toBe('supported');
  });

  it('surfaces contract violations from misbehaving implementations', async () => {
    const broken: MemoryInterpreter = new StubInterpreter({
      status: 'supported',
      interpretation: { nonsense: true },
    });

    await expect(
      broken.interpret('anything', { referenceTime: REFERENCE_TIME }),
    ).rejects.toThrow(InvalidInterpretationError);
  });
});
