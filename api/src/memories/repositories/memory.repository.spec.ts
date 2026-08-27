import { Test, type TestingModule } from '@nestjs/testing';
import { MemoryRepository } from './memory.repository';
import { PrismaService } from '../../database/prisma.service';
import type { Memory } from '../../generated/prisma/client';

describe('MemoryRepository', () => {
  let repository: MemoryRepository;
  let prismaMemory: {
    findMany: jest.Mock;
  };

  const storedMemory: Memory = {
    id: 'stored-1',
    type: 'STORED',
    title: 'Black backpack',
    summary: 'Put passport in black backpack',
    content: 'I put my passport in the black backpack.',
    metadata: { item: 'passport', location: 'black backpack' },
    occurredAt: null,
    dueAt: null,
    completedAt: null,
    createdAt: new Date('2026-08-27T15:40:41.479Z'),
    updatedAt: new Date('2026-08-27T15:40:41.479Z'),
  };

  const borrowedMemory: Memory = {
    id: 'borrowed-1',
    type: 'BORROWED',
    title: 'Charger',
    summary: 'David has my charger',
    content: 'David has my charger.',
    metadata: { item: 'charger', person: 'David' },
    occurredAt: null,
    dueAt: null,
    completedAt: null,
    createdAt: new Date('2026-08-27T15:40:49.474Z'),
    updatedAt: new Date('2026-08-27T15:40:49.474Z'),
  };

  beforeEach(async () => {
    prismaMemory = {
      findMany: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MemoryRepository,
        {
          provide: PrismaService,
          useValue: { memory: prismaMemory },
        },
      ],
    }).compile();

    repository = module.get(MemoryRepository);
  });

  it('findAll returns all memories when no filter is provided', async () => {
    prismaMemory.findMany.mockResolvedValue([storedMemory, borrowedMemory]);

    const result = await repository.findAll();

    expect(result).toEqual([storedMemory, borrowedMemory]);
    expect(prismaMemory.findMany).toHaveBeenCalledTimes(1);
    expect(prismaMemory.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { createdAt: 'desc' } }),
    );
  });

  it('findAll returns filtered memories when a type is provided', async () => {
    prismaMemory.findMany.mockResolvedValue([borrowedMemory]);

    const result = await repository.findAll({ type: 'BORROWED' });

    expect(result).toEqual([borrowedMemory]);
    expect(prismaMemory.findMany).toHaveBeenCalledTimes(1);
    expect(prismaMemory.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { type: 'BORROWED' },
        orderBy: { createdAt: 'desc' },
      }),
    );
  });

  it('findAll returns an empty array when no memories match the filter', async () => {
    prismaMemory.findMany.mockResolvedValue([]);

    const result = await repository.findAll({ type: 'PROMISED' });

    expect(result).toEqual([]);
    expect(prismaMemory.findMany).toHaveBeenCalledTimes(1);
    expect(prismaMemory.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { type: 'PROMISED' },
        orderBy: { createdAt: 'desc' },
      }),
    );
  });
});
