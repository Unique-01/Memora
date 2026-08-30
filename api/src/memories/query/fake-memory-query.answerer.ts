import type { Memory } from '../../generated/prisma/client';
import type { MemoryQueryAnswerer } from './memory-query-answerer.interface';
import type { MemoryQueryAnswer } from './memory-query-answerer.interface';

export class FakeMemoryQueryAnswerer implements MemoryQueryAnswerer {
  private cannedAnswers: MemoryQueryAnswer[];
  public receivedCalls: Array<{ question: string; memories: Memory[] }> = [];

  constructor(...cannedAnswers: MemoryQueryAnswer[]) {
    this.cannedAnswers =
      cannedAnswers.length > 0
        ? cannedAnswers
        : [
            {
              answer: 'Your passport is in the black backpack.',
            },
          ];
  }

  async answer(
    question: string,
    memories: Memory[],
  ): Promise<MemoryQueryAnswer> {
    this.receivedCalls.push({ question, memories });
    const next = this.cannedAnswers.shift();
    if (!next) {
      return {
        answer: 'No canned answer configured.',
      };
    }
    return Promise.resolve(next);
  }
}
