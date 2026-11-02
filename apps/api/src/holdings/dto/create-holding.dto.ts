import { IsIn, IsInt, IsNumber, IsOptional, IsPositive, IsString, Max } from 'class-validator';

export class CreateHoldingDto {
  @IsIn(['gold', 'silver'], { message: 'Metal must be either gold or silver.' })
  metal: 'gold' | 'silver';

  @IsNumber()
  @IsPositive({ message: 'Weight must be greater than zero.' })
  weight: number;

  @IsIn(['gram', 'ozt'])
  weight_unit: 'gram' | 'ozt';

  @IsNumber()
  @IsPositive({ message: 'Purity must be greater than zero.' })
  @Max(1)
  purity: number;

  @IsInt({ message: 'Quantity must be a whole number.' })
  @IsPositive()
  @Max(2147483647)
  quantity: number;

  @IsOptional()
  @IsString()
  holding_type?: string | null
}
