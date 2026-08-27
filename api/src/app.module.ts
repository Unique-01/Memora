import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { MemoriesModule } from './memories/memories.module';
import { PrismaModule } from './database/prisma.module';

@Module({
  imports: [PrismaModule, MemoriesModule],
  controllers: [AppController],
})
export class AppModule {}
