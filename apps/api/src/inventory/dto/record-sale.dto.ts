import { IsDateString, IsInt, IsPositive, Matches, Max } from 'class-validator';

export class RecordSaleDto {
  @IsInt({ message: 'Quantity must be a whole number.' })
  @IsPositive()
  @Max(2147483647)
  quantity: number;

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  sale_date: string;
}
