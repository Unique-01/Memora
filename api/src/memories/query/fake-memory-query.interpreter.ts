import type { MemoryQueryInterpreter } from './memory-query-interpreter.interface';
import type {
  MemoryQueryResult,
  QueryInterpretationContext,
} from './memory-query.types';

export class FakeMemoryQueryInterpreter implements MemoryQueryInterpreter {
  private cannedResults: MemoryQueryResult[];
  public receivedCalls: Array<{
    input: string;
    context: QueryInterpretationContext;
  }> = [];

  constructor(...cannedResults: MemoryQueryResult[]) {
    this.cannedResults =
      cannedResults.length > 0
        ? cannedResults
        : [
            {
              status: 'query',
              reason: null,
              query: {
                intent: 'WHERE',
                searchTerm: 'passport',
                type: 'STORED',
              },
            },
          ];
  }

  async interpret(
    input: string,
    context: QueryInterpretationContext,
  ): Promise<MemoryQueryResult> {
    this.receivedCalls.push({ input, context });
    const next = this.cannedResults.shift();
    if (!next) {
      return {
        status: 'unsupported',
        reason: 'No canned query result configured.',
      };
    }
    return Promise.resolve(next);
  }
}
