import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { MemoryRepository } from './repositories/memory.repository';
import { CreateMemoryDto } from './dto/create-memory.dto';
import { UpdateMemoryDto } from './dto/update-memory.dto';
import { MEMORY_INTERPRETER } from './interpretation/memory-interpreter.token';
import { MEMORY_QUERY_INTERPRETER } from './query/memory-query-interpreter.token';
import { MEMORY_QUERY_ANSWERER } from './query/memory-query-answerer.token';
import type { MemoryQueryAnswerer } from './query/memory-query-answerer.interface';
import type { MemoryInterpreter } from './interpretation/memory-interpreter.interface';
import type { MemoryQueryInterpreter } from './query/memory-query-interpreter.interface';
import type { InterpretationContext } from './interpretation/memory-interpreter.interface';
import type {
  QueryInterpretationContext,
  MemoryQueryResult,
} from './query/memory-query.types';
import type { InterpretedDate } from './interpretation/memory-interpretation.types';
import type { Memory, MemoryType } from '../generated/prisma/client';

/**
 * Outcome of the natural-language capture flow. `captured` carries the
 * persisted Memory; `unsupported`/`ambiguous` mean no record was created and
 * the caller may inform the user accordingly.
 */
export type CaptureMemoryResult =
  | { status: 'captured'; memory: Memory }
  | { status: 'unsupported'; reason?: string }
  | { status: 'ambiguous'; reason?: string };

export type QueryMemoryResult =
  | { status: 'found'; answer: string; memories: Memory[] }
  | { status: 'unsupported'; reason?: string }
  | { status: 'ambiguous'; reason?: string };

@Injectable()
export class MemoriesService {
  constructor(
    private repository: MemoryRepository,
    @Inject(MEMORY_INTERPRETER) private readonly interpreter: MemoryInterpreter,
    @Inject(MEMORY_QUERY_INTERPRETER)
    public queryInterpreter: MemoryQueryInterpreter,
    @Inject(MEMORY_QUERY_ANSWERER)
    public queryAnswerer: MemoryQueryAnswerer,
  ) {}

  async create(createMemoryDto: CreateMemoryDto): Promise<Memory> {
    return this.repository.create({
      ...createMemoryDto,
      occurredAt: this.toDateOrNull(createMemoryDto.occurredAt),
      dueAt: this.toDateOrNull(createMemoryDto.dueAt),
      completedAt: this.toDateOrNull(createMemoryDto.completedAt),
    });
  }

  /**
   * Interprets raw user input and, when the interpretation is supported,
   * persists it as a Memory whose `content` is the exact original input.
   * Interpreter/infrastructure failures propagate as errors — they are never
   * disguised as unsupported or ambiguous results.
   */
  async capture(input: string): Promise<CaptureMemoryResult> {
    const context: InterpretationContext = {
      referenceTime: new Date().toISOString(),
    };
    const result = await this.interpreter.interpret(input, context);

    if (result.status === 'unsupported' || result.status === 'ambiguous') {
      return result;
    }

    const { interpretation } = result;
    if (!interpretation.type) {
      // Defensive: the validation boundary rejects supported results without
      // a concrete type; this guard keeps persistence safe regardless.
      return {
        status: 'ambiguous',
        reason: 'Interpretation did not identify a memory type.',
      };
    }
    const memory = await this.repository.create({
      type: interpretation.type,
      // The contract allows null display fields; the database does not.
      // Fall back to deterministic derivations of the input — never invented
      // facts. The original input itself remains the summary fallback.
      title: interpretation.title ?? deriveTitle(input),
      summary: interpretation.summary ?? input,
      content: input,
      metadata: interpretation.metadata as Prisma.InputJsonValue,
      occurredAt: this.interpretedDateToDate(interpretation.occurredAt),
      dueAt: this.interpretedDateToDate(interpretation.dueAt),
      completedAt: this.interpretedDateToDate(interpretation.completedAt),
    });

    return { status: 'captured', memory };
  }

  /**
   * Retrieves all memories, optionally narrowed to a single MemoryType.
   * Ordering (newest-first) is the repository's responsibility, keeping the
   * client unable to influence sort order for this ticket.
   */
  /**
   * Retrieves all memories, optionally narrowed to a single MemoryType
   * and/or search term.
   */
  async findAll(filter?: {
    type?: MemoryType;
    search?: string;
  }): Promise<Memory[]> {
    return this.repository.findAll(filter);
  }

  async query(input: string): Promise<QueryMemoryResult> {
    const context: QueryInterpretationContext = {
      referenceTime: new Date().toISOString(),
    };
    const result: MemoryQueryResult = await this.queryInterpreter.interpret(
      input,
      context,
    );

    if (result.status === 'unsupported' || result.status === 'ambiguous') {
      return {
        status: result.status,
        reason: result.reason,
      };
    }

    const memories = await this.repository.findAll({
      type: result.query.type ?? undefined,
      search: result.query.searchTerm ?? undefined,
    });

    if (memories.length === 0) {
      return {
        status: 'found',
        answer: 'No matching memories found.',
        memories: [],
      };
    }

    const { answer } = await this.queryAnswerer.answer(input, memories);

    return {
      status: 'found',
      answer,
      memories,
    };
  }

  async findById(id: string): Promise<Memory> {
    const memory = await this.repository.findById(id);
    if (!memory) {
      throw new NotFoundException(`Memory with ID ${id} not found`);
    }
    return memory;
  }

  async update(id: string, updateMemoryDto: UpdateMemoryDto): Promise<Memory> {
    try {
      return await this.repository.update(id, {
        ...updateMemoryDto,
        occurredAt: this.toDateOrUndefined(updateMemoryDto.occurredAt),
        dueAt: this.toDateOrUndefined(updateMemoryDto.dueAt),
        completedAt: this.toDateOrUndefined(updateMemoryDto.completedAt),
      });
    } catch (error) {
      throw this.mapRecordNotFound(error, id);
    }
  }

  async delete(id: string): Promise<Memory> {
    try {
      return await this.repository.delete(id);
    } catch (error) {
      throw this.mapRecordNotFound(error, id);
    }
  }

  private interpretedDateToDate(date: InterpretedDate | null): Date | null {
    return date ? new Date(date.value) : null;
  }

  private toDateOrNull(value?: string | null): Date | null {
    return value ? new Date(value) : null;
  }

  private toDateOrUndefined(value?: string | null): Date | undefined | null {
    if (value === undefined) return undefined;
    return value ? new Date(value) : null;
  }

  private mapRecordNotFound(error: unknown, id: string): unknown {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      return new NotFoundException(`Memory with ID ${id} not found`);
    }
    return error;
  }
}

function deriveTitle(input: string): string {
  const normalized = input.replace(/\s+/g, ' ').trim();
  return normalized.length <= 60 ? normalized : `${normalized.slice(0, 57)}...`;
}
