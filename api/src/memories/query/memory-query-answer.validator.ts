import type { MemoryQueryAnswer } from './memory-query-answerer.interface';

export function validateMemoryQueryAnswer(raw: unknown): MemoryQueryAnswer {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Query answer result must be an object.');
  }

  const record = raw as Record<string, unknown>;
  const answer = record.answer;

  if (typeof answer !== 'string' || answer.trim().length === 0) {
    throw new Error('Query answer requires a non-empty string answer.');
  }

  return {
    answer: answer.trim(),
  };
}
