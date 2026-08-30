import { Module } from '@nestjs/common';
import { MemoriesService } from './memories.service';
import { MemoriesController } from './memories.controller';
import { MemoryRepository } from './repositories/memory.repository';
import { MEMORY_INTERPRETER } from './interpretation/memory-interpreter.token';
import { OpenRouterMemoryInterpreter } from './interpretation/providers/openrouter-memory.interpreter';
import { MEMORY_QUERY_INTERPRETER } from './query/memory-query-interpreter.token';
import { OpenRouterMemoryQueryInterpreter } from './query/providers/openrouter-memory-query.interpreter';
import { MEMORY_QUERY_ANSWERER } from './query/memory-query-answerer.token';
import { OpenRouterMemoryQueryAnswerer } from './query/providers/openrouter-memory-query-answer.interpreter';

@Module({
  controllers: [MemoriesController],
  providers: [
    MemoriesService,
    MemoryRepository,
    {
      provide: MEMORY_INTERPRETER,
      useFactory: () => OpenRouterMemoryInterpreter.fromEnv(),
    },
    {
      provide: MEMORY_QUERY_INTERPRETER,
      useFactory: () => OpenRouterMemoryQueryInterpreter.fromEnv(),
    },
    {
      provide: MEMORY_QUERY_ANSWERER,
      useFactory: () => OpenRouterMemoryQueryAnswerer.fromEnv(),
    },
  ],
})
export class MemoriesModule {}
