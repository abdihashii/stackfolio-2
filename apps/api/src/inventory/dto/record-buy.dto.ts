import { IsDateString, IsInt, IsOptional, IsPositive, IsUUID, Matches, Max } from 'class-validator';

export class RecordBuyDto {
  @IsInt({ message: 'Quantity must be a whole number.' })
  @IsPositive()
  @Max(2147483647)
  quantity: number;

  @IsUUID()
  item_type_id: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  acquisition_date?: string | null;

  @IsOptional()
  @Matches(/^(?:\d+|\d*\.\d{1,2})$/, {
    message: 'Enter a nonnegative USD amount with at most two decimal places.',
  })
  total_paid?: string | null;
}
