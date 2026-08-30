import { IsNotEmpty, IsString, Validate } from 'class-validator';
import { IsNotBlankConstraint } from './capture-memory.dto';

export class QueryMemoryDto {
  @IsString()
  @IsNotEmpty()
  @Validate(IsNotBlankConstraint)
  input!: string;
}
