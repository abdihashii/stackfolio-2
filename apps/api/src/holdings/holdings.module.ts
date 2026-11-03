import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Item } from './entities/item.entity.js';
import { InventoryController } from './inventory.controller.js';
import { HoldingsService } from './holdings.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Item])],
  controllers: [InventoryController],
  providers: [HoldingsService],
})
export class HoldingsModule {}
