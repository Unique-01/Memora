import { IsEnum, IsOptional } from 'class-validator';
import { MemoryType } from '../../generated/prisma/enums';

/**
 * Query parameters for GET /memories. Intentionally minimal: only the
 * optional `type` filter that this endpoint supports. Sorting, pagination,
 * and full-text search are out of scope for this ticket.
 */
export class FindMemoriesQueryDto {
  @IsOptional()
  @IsEnum(MemoryType)
  type?: MemoryType;
}
