import { Module } from '@nestjs/common';
import { MemoriesService } from './memories.service';
import { MemoriesController } from './memories.controller';
import { MemoryRepository } from './repositories/memory.repository';
import { MEMORY_INTERPRETER } from './interpretation/memory-interpreter.token';
import { OpenRouterMemoryInterpreter } from './interpretation/providers/openrouter-memory.interpreter';

@Module({
  controllers: [MemoriesController],
  providers: [
    MemoriesService,
    MemoryRepository,
    {
      provide: MEMORY_INTERPRETER,
      useFactory: () => OpenRouterMemoryInterpreter.fromEnv(),
    },
  ],
})
export class MemoriesModule {}
