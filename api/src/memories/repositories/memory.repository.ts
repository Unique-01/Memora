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
  /**
   * Retrieve all memories, optionally filtered by type and/or search query,
   * sorted by createdAt descending (newest first).
   */
  async findAll(filter?: {
    type?: MemoryType;
    search?: string;
  }): Promise<Memory[]> {
    const typeCondition = filter?.type ? { type: filter.type } : undefined;
    const searchCondition =
      filter?.search && filter.search.trim().length > 0
        ? {
            OR: [
              {
                title: {
                  contains: filter.search.trim(),
                  mode: 'insensitive' as const,
                },
              },
              {
                summary: {
                  contains: filter.search.trim(),
                  mode: 'insensitive' as const,
                },
              },
              {
                content: {
                  contains: filter.search.trim(),
                  mode: 'insensitive' as const,
                },
              },
            ],
          }
        : undefined;

    let where: Prisma.MemoryWhereInput | undefined;
    if (typeCondition && searchCondition) {
      where = { AND: [typeCondition, searchCondition] };
    } else {
      where = typeCondition ?? searchCondition;
    }

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
