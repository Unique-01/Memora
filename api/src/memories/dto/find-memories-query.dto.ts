import { IsEnum, IsOptional, IsString } from 'class-validator';
import { MemoryType } from '../../generated/prisma/enums';

/**
 * Query parameters for GET /memories. Supports optional `type` filter
 * and optional `search` query term.
 */
export class FindMemoriesQueryDto {
  @IsOptional()
  @IsEnum(MemoryType)
  type?: MemoryType;

  @IsOptional()
  @IsString()
  search?: string;
}
