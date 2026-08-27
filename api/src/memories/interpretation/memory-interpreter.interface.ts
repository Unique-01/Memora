import type { MemoryInterpretationResult } from './memory-interpretation.types';

/**
 * Context supplied by the application for every interpretation request.
 *
 * `referenceTime` is the moment the user submitted the input, as an ISO 8601
 * string. It must be provided explicitly: relative expressions such as
 * "tomorrow" or "in two days" may only be resolved against it, never against
 * an arbitrary system clock at interpretation time.
 */
export interface InterpretationContext {
  referenceTime: string;
}

/**
 * Application-level abstraction over natural-language interpretation.
 *
 * Implementations wrap a specific interpreter (e.g. an AI provider), but the
 * rest of the application depends only on this interface and on the
 * {@link MemoryInterpretationResult} contract. Implementations are untrusted:
 * their output passes through application-level validation before it can
 * become a `Memory`, and they never touch persistence.
 */
export interface MemoryInterpreter {
  interpret(
    input: string,
    context: InterpretationContext,
  ): Promise<MemoryInterpretationResult>;
}
