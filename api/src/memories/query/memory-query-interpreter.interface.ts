import type {
  MemoryQueryResult,
  QueryInterpretationContext,
} from './memory-query.types';

export interface MemoryQueryInterpreter {
  interpret(
    input: string,
    context: QueryInterpretationContext,
  ): Promise<MemoryQueryResult>;
}
