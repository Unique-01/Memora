import {
  IsString,
  IsEnum,
  IsOptional,
  IsDateString,
  IsObject,
} from 'class-validator';
import { MemoryType } from '../../generated/prisma/enums';

export type JsonValue =
  string | number | boolean | null | JsonValue[] | JsonObject;

export interface JsonObject {
  [key: string]: JsonValue;
}

export class CreateMemoryDto {
  @IsEnum(MemoryType)
  type: MemoryType;

  @IsString()
  title: string;

  @IsString()
  summary: string;

  @IsString()
  content: string;

  @IsObject()
  metadata: JsonObject;

  @IsOptional()
  @IsDateString()
  occurredAt?: string;

  @IsOptional()
  @IsDateString()
  dueAt?: string;

  @IsOptional()
  @IsDateString()
  completedAt?: string | null;
}
