import {
  IsNotEmpty,
  IsString,
  Validate,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

/**
 * Rejects empty or whitespace-only strings. Deliberately does NOT transform
 * the value: the original input must reach `Memory.content` unmodified.
 */
@ValidatorConstraint({ name: 'isNotBlank', async: false })
export class IsNotBlankConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return typeof value === 'string' && value.trim().length > 0;
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args.property} must not be blank`;
  }
}

export class CaptureMemoryDto {
  @IsString()
  @IsNotEmpty()
  @Validate(IsNotBlankConstraint)
  input!: string;
}
