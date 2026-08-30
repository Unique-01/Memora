import type { Memory } from '../../generated/prisma/client';

export interface MemoryQueryAnswer {
  answer: string;
}

export interface MemoryQueryAnswerer {
  answer(question: string, memories: Memory[]): Promise<MemoryQueryAnswer>;
}
