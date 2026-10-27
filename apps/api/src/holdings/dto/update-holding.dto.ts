import { PartialType } from '@nestjs/mapped-types';
import { CreateHoldingDto } from './create-holding.dto.js';

export class UpdateHoldingDto extends PartialType(CreateHoldingDto) {}
