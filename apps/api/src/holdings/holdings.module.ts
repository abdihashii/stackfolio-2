import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Item } from './entities/item.entity.js';
import { HoldingsController } from './holdings.controller.js';
import { HoldingsService } from './holdings.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Item])],
  controllers: [HoldingsController],
  providers: [HoldingsService],
})
export class HoldingsModule {}
