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
  '2. "supported" requires one concrete type chosen from strict semantic boundaries:',
  '   - BORROWED: Use when the user\'s item, money, or possession was given/lent to another person and is expected to be returned (e.g., "I lent David my charger", "I gave Sarah my laptop and she will return it Friday", "John has my book"). The core characteristic is that the user\'s thing is currently with someone else and expected back. Note: Do NOT classify something as PROMISED merely because someone else promised to return an item (e.g. "I gave David my laptop and he promised to return it in two days" is BORROWED, because the user\'s item is with David).',
  '   - STORED: Use when the user placed, kept, or stored something somewhere and the important memory is its location (e.g., "I put my passport in the black backpack", "My spare keys are in the kitchen drawer"). Do not classify as STORED merely because a location is mentioned; the core event must be storage/placement.',
  '   - LAST_DONE: Use when the user is recording something they already did (e.g., "I serviced the generator yesterday", "I paid the electricity bill"). Must represent a completed past action, not a future intention or commitment.',
  '   - PROMISED: Use when there is a user commitment, promise, obligation, or agreed future action by the user (e.g., "I promised Mum I\'d send the document tomorrow", "I told Sarah I would call her Friday"). Do not assume every statement involving money or third parties returning things is a user promise; if someone else owes the user money (e.g., "Landlady owes me 30,000 naira and should return it Friday"), classify it according to supported semantics without inventing a personal promise by the user.',
  '   - If the statement genuinely cannot be mapped confidently to one of the four supported types, return "ambiguous" rather than guessing.',
  '3. Date resolution rules:',
  '   - context.referenceTime is the authoritative current date/time. Calculate relative dates strictly from that reference time, never from your own knowledge of the current date. Do not substitute the current system date for the supplied reference time.',
  '   - "tomorrow", "yesterday", "in N days", etc. must be calculated arithmetically from referenceTime.',
  '   - Weekday expressions ("Friday", "by Friday") must follow strict deterministic rules:',
  '     * "Friday" / "by Friday" → the next upcoming Friday after the reference date (unless the reference date itself is Friday and the wording clearly refers to that day).',
  '     * "this Friday" → Friday within the current calendar week.',
  '     * "next Friday" → Friday of the following calendar week.',
  '   - Resolved values must be complete ISO-8601 date-time strings. When a date is specified without a time, use the established date-only resolution convention consistently.',
  '   - Do not invent a date when the input does not provide enough information to justify one.',
  '   - Set relative:true for dates derived from relative language. Set relative:false for explicitly stated absolute dates.',
  '4. metadata contains type-specific facts from the input (e.g. item, person, location); keep keys lowercase and values grounded in the input.',
  '5. Never echo or paraphrase the original input into any field. title and summary must be concise, descriptive, and useful at a glance when scanning a list.',
  '   - title requirements: concise, describes the actual memory, captures important subject/action, useful when scanning a list, NOT a copy of the sentence, NOT generic like "Memory", avoid unnecessary punctuation and first-person phrasing.',
  '   - summary requirements: concise natural-language description of the memory, preserving useful context without unnecessary repetition.',
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
