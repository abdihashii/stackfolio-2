import { IsDateString, IsInt, IsPositive, IsUUID, Matches, Max } from 'class-validator';

export class RecordSaleDto {
  @IsUUID()
  itemId: string;

  @IsUUID()
  buyId: string;

  @IsInt({ message: 'Quantity must be a whole number.' })
  @IsPositive()
  @Max(2147483647)
  quantity: number;

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  sale_date: string;
}
