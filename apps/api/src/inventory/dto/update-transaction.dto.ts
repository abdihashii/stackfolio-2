import { IsDateString, IsInt, IsPositive, Matches, Max, ValidateIf } from 'class-validator';

export class UpdateTransactionDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsInt({ message: 'Quantity must be a whole number.' })
  @IsPositive()
  @Max(2147483647)
  quantity?: number;

  @ValidateIf((_object, value) => value !== undefined)
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  effective_date?: string;
}
