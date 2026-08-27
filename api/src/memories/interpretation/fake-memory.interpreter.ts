import { validateInterpretationResult } from './interpretation.validator';
import type { MemoryInterpreter } from './memory-interpreter.interface';
import type { MemoryInterpretationResult } from './memory-interpretation.types';
import type { InterpretationContext } from './memory-interpreter.interface';

interface RecordedCall {
  input: string;
  context: InterpretationContext;
}

/**
 * In-memory `MemoryInterpreter` for tests.
 *
 * Returns canned results (raw, unvalidated fixtures) in sequence and records
 * every call it receives. It runs output through
 * `validateInterpretationResult` exactly like a production consumer would,
 * demonstrating that application code depends only on the
 * `MemoryInterpreter` interface and the validated contract — never on a
 * concrete implementation or provider.
 */
export class FakeMemoryInterpreter implements MemoryInterpreter {
  private readonly results: unknown[];
  private readonly calls: RecordedCall[] = [];

  constructor(...results: unknown[]) {
    this.results = [...results];
  }

  interpret(
    _input: string,
    _context: InterpretationContext,
  ): Promise<MemoryInterpretationResult> {
    this.calls.push({ input: _input, context: _context });
    const next = this.results.shift();
    if (next === undefined) {
      return Promise.reject(
        new Error('FakeMemoryInterpreter has no remaining configured results'),
      );
    }
    return Promise.resolve().then(() => validateInterpretationResult(next));
  }

  /** Inputs/contexts received so far, for asserting how the app calls interpreters. */
  get receivedCalls(): readonly RecordedCall[] {
    return this.calls;
  }
}
