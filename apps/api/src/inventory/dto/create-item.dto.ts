import { IsIn, IsInt, IsNumber, IsOptional, IsPositive, Max, Matches, IsDateString, IsUUID } from 'class-validator';

export class CreateItemDto {
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

  @IsUUID()
  item_type_id: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  acquisition_date?: string | null;
}
