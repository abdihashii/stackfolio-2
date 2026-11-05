import { IsInt, IsPositive, Max } from 'class-validator';

export class UpdateTransactionDto {
  @IsInt({ message: 'Quantity must be a whole number.' })
  @IsPositive()
  @Max(2147483647)
  quantity: number;
}
