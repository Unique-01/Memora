import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { Memory, MemoryType, Prisma } from '../../generated/prisma/client';

@Injectable()
export class MemoryRepository {
  constructor(private prisma: PrismaService) {}

  async create(data: Prisma.MemoryCreateInput): Promise<Memory> {
    return this.prisma.memory.create({ data });
  }

  /**
   * Retrieve all memories, optionally filtered by type, sorted by createdAt
   * descending (newest first). The ordering is hard-coded so the client
   * cannot influence it for this ticket.
   */
  async findAll(filter?: { type?: MemoryType }): Promise<Memory[]> {
    const where = filter?.type ? { type: filter.type } : undefined;
    return this.prisma.memory.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string): Promise<Memory | null> {
    return this.prisma.memory.findUnique({ where: { id } });
  }

  async update(id: string, data: Prisma.MemoryUpdateInput): Promise<Memory> {
    return this.prisma.memory.update({ where: { id }, data });
  }

  async delete(id: string): Promise<Memory> {
    return this.prisma.memory.delete({ where: { id } });
  }
}
