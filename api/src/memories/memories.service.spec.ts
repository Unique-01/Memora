import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Prisma } from '../generated/prisma/client';
import { MemoriesService } from './memories.service';
import { MemoryRepository } from './repositories/memory.repository';
import { FakeMemoryInterpreter } from './interpretation/fake-memory.interpreter';
import { MEMORY_INTERPRETER } from './interpretation/memory-interpreter.token';
import type { Memory } from '../generated/prisma/client';

describe('MemoriesService', () => {
  let service: MemoriesService;
  let repository: {
    create: jest.Mock;
    findAll: jest.Mock;
    findById: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };

  const memory: Memory = {
    id: 'memory-1',
    type: 'BORROWED',
    title: 'Charger',
    summary: 'David has my charger.',
    content: 'I gave David my charger.',
    metadata: { item: 'charger', person: 'David' },
    occurredAt: null,
    dueAt: new Date('2026-08-21T00:00:00.000Z'),
    completedAt: null,
    createdAt: new Date('2026-08-20T00:00:00.000Z'),
    updatedAt: new Date('2026-08-20T00:00:00.000Z'),
  };

  const notFoundError = new Prisma.PrismaClientKnownRequestError(
    'Record not found',
    { code: 'P2025', clientVersion: 'test' },
  );

  beforeEach(async () => {
    repository = {
      create: jest.fn().mockResolvedValue(memory),
      findAll: jest.fn().mockResolvedValue([memory]),
      findById: jest.fn().mockResolvedValue(memory),
      update: jest.fn().mockResolvedValue(memory),
      delete: jest.fn().mockResolvedValue(memory),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        MemoriesService,
        { provide: MemoryRepository, useValue: repository },
        { provide: MEMORY_INTERPRETER, useValue: new FakeMemoryInterpreter() },
      ],
    }).compile();

    service = moduleRef.get(MemoriesService);
  });

  it('creates a memory with metadata', async () => {
    const metadata = { item: 'charger', person: 'David', action: 'return' };
    const result = await service.create({
      type: 'BORROWED',
      title: 'Charger',
      summary: 'David has my charger.',
      content: 'I gave David my charger.',
      metadata,
      dueAt: '2026-08-21T00:00:00.000Z',
    });

    expect(result).toEqual(memory);
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'BORROWED',
        metadata,
        dueAt: new Date('2026-08-21T00:00:00.000Z'),
      }),
    );
  });

  it('creates a memory with completedAt and converts it to a Date', async () => {
    await service.create({
      type: 'LAST_DONE',
      title: 'Generator servicing',
      summary: 'Serviced the generator.',
      content: 'I serviced the generator yesterday.',
      metadata: {},
      completedAt: '2026-08-19T10:00:00.000Z',
    });

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        completedAt: new Date('2026-08-19T10:00:00.000Z'),
      }),
    );
  });

  it('sets omitted optional dates to null on creation', async () => {
    await service.create({
      type: 'STORED',
      title: 'Passport',
      summary: 'Passport in the black backpack.',
      content: 'The passport is in the black backpack.',
      metadata: {},
    });

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        occurredAt: null,
        dueAt: null,
        completedAt: null,
      }),
    );
  });

  it('finds a memory by id', async () => {
    const result = await service.findById('memory-1');
    expect(result).toEqual(memory);
    expect(repository.findById).toHaveBeenCalledWith('memory-1');
  });

  it('throws NotFound when memory does not exist', async () => {
    repository.findById.mockResolvedValue(null);
    await expect(service.findById('missing')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('clears completedAt when set to null', async () => {
    await service.update('memory-1', {
      completedAt: null,
    });

    expect(repository.update).toHaveBeenCalledWith(
      'memory-1',
      expect.objectContaining({
        completedAt: null,
      }),
    );
  });

  it('preserves optional dates when omitted on update', async () => {
    await service.update('memory-1', { title: 'Charger (USB-C)' });

    expect(repository.update).toHaveBeenCalledWith(
      'memory-1',
      expect.objectContaining({
        title: 'Charger (USB-C)',
        occurredAt: undefined,
        dueAt: undefined,
        completedAt: undefined,
      }),
    );
  });

  it('throws NotFound when updating a missing memory (P2025)', async () => {
    repository.update.mockRejectedValue(notFoundError);
    await expect(service.update('missing', { title: 'x' })).rejects.toThrow(
      NotFoundException,
    );
  });

  it('propagates unexpected update errors instead of returning NotFound', async () => {
    repository.update.mockRejectedValue(new Error('connection refused'));
    await expect(service.update('memory-1', { title: 'x' })).rejects.toThrow(
      'connection refused',
    );
    await expect(
      service.update('memory-1', { title: 'x' }),
    ).rejects.not.toThrow(NotFoundException);
  });

  it('deletes a memory', async () => {
    const result = await service.delete('memory-1');
    expect(result).toEqual(memory);
    expect(repository.delete).toHaveBeenCalledWith('memory-1');
  });

  it('throws NotFound when deleting a missing memory (P2025)', async () => {
    repository.delete.mockRejectedValue(notFoundError);
    await expect(service.delete('missing')).rejects.toThrow(NotFoundException);
  });

  it('propagates unexpected delete errors instead of returning NotFound', async () => {
    repository.delete.mockRejectedValue(new Error('database unavailable'));
    await expect(service.delete('memory-1')).rejects.toThrow(
      'database unavailable',
    );
    await expect(service.delete('memory-1')).rejects.not.toThrow(
      NotFoundException,
    );
  });

  it('lists memories', async () => {
    const result = await service.findAll();
    expect(result).toEqual([memory]);
  });

  it('lists memories filtered by type', async () => {
    const result = await service.findAll({ type: 'BORROWED' });
    expect(result).toEqual([memory]);
    expect(repository.findAll).toHaveBeenCalledWith({ type: 'BORROWED' });
  });

  it('lists memories with no filter when no type is provided', async () => {
    const result = await service.findAll();
    expect(result).toEqual([memory]);
    expect(repository.findAll).toHaveBeenCalledWith(undefined);
  });
});
