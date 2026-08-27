import {
  MEMORY_TYPES,
  type InterpretedDate,
  type MemoryInterpretation,
  type MemoryInterpretationResult,
  type MemoryType,
} from './memory-interpretation.types';

/**
 * Thrown when raw interpreter output does not satisfy the interpretation
 * contract. This is a contract violation, not an "unsupported input" outcome.
 */
export class InvalidInterpretationError extends Error {
  constructor(message: string) {
    super(`Invalid interpretation result: ${message}`);
    this.name = 'InvalidInterpretationError';
  }
}

const RESULT_STATUSES = ['supported', 'unsupported', 'ambiguous'] as const;

const INTERPRETATION_KEYS = [
  'type',
  'title',
  'summary',
  'metadata',
  'occurredAt',
  'dueAt',
  'completedAt',
] as const;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    (Object.getPrototypeOf(value) === Object.prototype ||
      Object.getPrototypeOf(value) === null)
  );
}

/** Guards that a parsed value contains only JSON-compatible data. */
function assertJsonCompatible(value: unknown, path: string): void {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean' ||
    (typeof value === 'number' && Number.isFinite(value))
  ) {
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertJsonCompatible(item, `${path}[${index}]`),
    );
    return;
  }
  if (isPlainObject(value)) {
    for (const [key, item] of Object.entries(value)) {
      assertJsonCompatible(item, `${path}.${key}`);
    }
    return;
  }
  throw new InvalidInterpretationError(`${path} is not JSON-compatible`);
}

function parseDate(value: unknown, field: string): InterpretedDate | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (!isPlainObject(value)) {
    throw new InvalidInterpretationError(`${field} must be an object or null`);
  }
  const { value: dateValue, relative } = value;
  if (
    typeof dateValue !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T/.test(dateValue) ||
    Number.isNaN(new Date(dateValue).getTime())
  ) {
    throw new InvalidInterpretationError(
      `${field}.value must be an ISO 8601 date-time string`,
    );
  }
  if (typeof relative !== 'boolean') {
    throw new InvalidInterpretationError(`${field}.relative must be a boolean`);
  }
  return { value: dateValue, relative };
}

function parseOptionalText(value: unknown, field: string): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new InvalidInterpretationError(
      `${field} must be a non-empty string or null`,
    );
  }
  return value;
}

function parseType(value: unknown): MemoryType | null {
  if (value === null || value === undefined) {
    return null;
  }
  const isKnownType =
    typeof value === 'string' &&
    (MEMORY_TYPES as readonly string[]).includes(value);
  if (!isKnownType) {
    throw new InvalidInterpretationError(
      `type must be one of ${MEMORY_TYPES.join(', ')} or null`,
    );
  }
  return value as MemoryType;
}

function parseInterpretation(raw: unknown): MemoryInterpretation {
  if (!isPlainObject(raw)) {
    throw new InvalidInterpretationError('interpretation must be an object');
  }

  const unknownKeys = Object.keys(raw).filter(
    (key) =>
      !INTERPRETATION_KEYS.includes(
        key as (typeof INTERPRETATION_KEYS)[number],
      ),
  );
  if (unknownKeys.length > 0) {
    // Includes `content`: the interpreter never produces the original input.
    throw new InvalidInterpretationError(
      `unexpected interpretation keys: ${unknownKeys.join(', ')}`,
    );
  }

  const metadata = raw.metadata ?? {};
  if (!isPlainObject(metadata)) {
    throw new InvalidInterpretationError('metadata must be a JSON object');
  }
  assertJsonCompatible(metadata, 'metadata');

  const type = parseType(raw.type);
  if (!type) {
    throw new InvalidInterpretationError(
      'supported interpretations must carry a concrete memory type; use status "unsupported" or "ambiguous" instead',
    );
  }

  return {
    type,
    title: parseOptionalText(raw.title, 'title'),
    summary: parseOptionalText(raw.summary, 'summary'),
    metadata,
    occurredAt: parseDate(raw.occurredAt, 'occurredAt'),
    dueAt: parseDate(raw.dueAt, 'dueAt'),
    completedAt: parseDate(raw.completedAt, 'completedAt'),
  };
}

/**
 * Validates raw interpreter output (from any source) into a trusted
 * {@link MemoryInterpretationResult}.
 *
 * This is the application-side boundary between an untrusted interpreter and
 * the Memory domain. It enforces structure and allowed values regardless of
 * whatever structured-output guarantees a provider may offer; semantic
 * grounding remains the interpreter's responsibility.
 *
 * Throws {@link InvalidInterpretationError} on contract violations. Returns
 * `supported`, `unsupported`, or `ambiguous` results unchanged in meaning.
 */
export function validateInterpretationResult(
  raw: unknown,
): MemoryInterpretationResult {
  if (!isPlainObject(raw)) {
    throw new InvalidInterpretationError('result must be an object');
  }

  const { status } = raw;
  if (
    typeof status !== 'string' ||
    !RESULT_STATUSES.includes(status as never)
  ) {
    throw new InvalidInterpretationError(
      `status must be one of ${RESULT_STATUSES.join(', ')}`,
    );
  }

  const reason =
    raw.reason === undefined
      ? undefined
      : parseOptionalText(raw.reason, 'reason');

  if (status === 'supported') {
    return { status, interpretation: parseInterpretation(raw.interpretation) };
  }

  return status === 'unsupported'
    ? { status: 'unsupported', reason: reason ?? undefined }
    : { status: 'ambiguous', reason: reason ?? undefined };
}
