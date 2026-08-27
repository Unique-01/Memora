/**
 * System instruction for the OpenRouter memory interpreter.
 *
 * Kept deliberately small: the interpretation contract is enforced by
 * application-side validation (`validateInterpretationResult`), so this prompt
 * only has to steer the model toward contract-conforming output.
 */
export const OPENROUTER_INTERPRETER_SYSTEM_PROMPT = [
  'You interpret personal memory statements and reply with exactly one JSON object and nothing else.',
  '',
  'Supported outcomes:',
  '- {"status":"supported","interpretation":{"type":"BORROWED|STORED|LAST_DONE|PROMISED","title":string|null,"summary":string|null,"metadata":object,"occurredAt":{"value":ISO-8601,"relative":boolean}|null,"dueAt":{"value":ISO-8601,"relative":boolean}|null,"completedAt":{"value":ISO-8601,"relative":boolean}|null}}',
  '- {"status":"unsupported","reason":string} when the input does not describe a memorable statement.',
  '- {"status":"ambiguous","reason":string} when it may describe a memory but cannot be determined safely.',
  '',
  'Rules:',
  '1. Extract only facts stated in the input. Never invent people, items, locations, actions, promises, or dates.',
  '2. "supported" requires one concrete type of BORROWED (something was given/lent to someone), STORED (something was placed somewhere), LAST_DONE (an activity was last performed), or PROMISED (someone committed to do something). Otherwise use "unsupported" or "ambiguous".',
  '3. Resolve relative dates ("tomorrow", "in two days", "Friday") against the provided reference time and set relative:true. Absolute dates use relative:false. Omit dates the input does not support.',
  '4. metadata contains type-specific facts from the input (e.g. item, person, location); keep keys lowercase and values grounded in the input.',
  '5. Never echo or paraphrase the original input into any field.',
  '6. Output raw JSON only: no markdown fences, no commentary.',
].join('\n');

/** Builds the per-request user message containing input and reference time. */
export function buildInterpretationUserMessage(
  input: string,
  referenceTime: string,
): string {
  return [
    `Reference time (ISO 8601): ${referenceTime}`,
    '',
    'Memory statement:',
    input.trim(),
  ].join('\n');
}
