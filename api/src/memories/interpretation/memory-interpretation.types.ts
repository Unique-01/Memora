/**
 * Application-level contract for natural-language memory interpretation.
 *
 * This describes what an interpreter UNDERSTOOD from user input. It is
 * deliberately separate from the persisted Prisma `Memory` model:
 *
 * - There is no `content` field: the original user input is preserved by the
 *   caller and stored as `Memory.content`. The interpreter must never emit,
 *   rewrite, or paraphrase the original input.
 * - There is no `id`, `createdAt`, or `updatedAt`: those belong to storage.
 * - Every field except `metadata` is nullable: absence means "not supported
 *   by the input", never a guessed default.
 */

export const MEMORY_TYPES = [
  'BORROWED',
  'STORED',
  'LAST_DONE',
  'PROMISED',
] as const;

export type MemoryType = (typeof MEMORY_TYPES)[number];

export type InterpretationStatus = 'supported' | 'unsupported' | 'ambiguous';

/**
 * A date/time mentioned in the input, resolved against
 * `InterpretationContext.referenceTime`.
 *
 * `value` is always an ISO 8601 string. `relative` marks dates the user
 * expressed relative to another moment ("tomorrow", "in two days") as opposed
 * to absolute statements ("on Friday next week"), so downstream logic can
 * tell evidence from arithmetic.
 */
export interface InterpretedDate {
  value: string;
  relative: boolean;
}

export interface MemoryInterpretation {
  /**
   * One of {@link MEMORY_TYPES}, or null when the input does not support a
   * confident classification. A supported result must carry a concrete type;
   * interpreters signal "no supported memory identified" through the result
   * status instead of inventing a type.
   */
  type: MemoryType | null;

  /** Short human-readable label derived from the input, or null. */
  title: string | null;

  /** Concise restatement of the memory in the interpreter's own words, or null. */
  summary: string | null;

  /**
   * Flexible, type-specific facts extracted from the input. Only information
   * grounded in the input belongs here; structure varies per type and no
   * universal schema is imposed.
   */
  metadata: Record<string, unknown>;

  occurredAt: InterpretedDate | null;
  dueAt: InterpretedDate | null;
  completedAt: InterpretedDate | null;
}

/**
 * Result of interpreting a piece of natural-language input.
 *
 * - `supported`: the input describes one of the supported memory types.
 * - `unsupported`: the input does not describe a memory this system stores.
 * - `ambiguous`: the input may describe a memory, but there is not enough
 *   information to determine what it means safely. Callers may ask the user
 *   for clarification; interpreters must not force a guess.
 *
 * `reason` optionally explains an unsupported/ambiguous outcome for logging
 * or clarification UX.
 */
export type MemoryInterpretationResult =
  | { status: 'supported'; interpretation: MemoryInterpretation }
  | { status: 'unsupported'; reason?: string }
  | { status: 'ambiguous'; reason?: string };
