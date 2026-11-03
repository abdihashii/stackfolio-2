import { PartialType } from '@nestjs/mapped-types';

import { RecordBuyDto } from './record-buy.dto.js';

export class UpdateItemDto extends PartialType(RecordBuyDto) {}
