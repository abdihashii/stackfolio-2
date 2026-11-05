import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SpotPricesModule } from '../spot-prices/spot-prices.module.js';
import { ItemType } from './entities/item-type.entity.js';
import { Item } from './entities/item.entity.js';
import { Transaction } from './entities/transaction.entity.js';
import { InventoryController } from './inventory.controller.js';
import { InventoryService } from './inventory.service.js';
import { ItemTypesController } from './item-types.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Item, ItemType, Transaction]), SpotPricesModule],
  controllers: [InventoryController, ItemTypesController],
  providers: [InventoryService],
})
export class InventoryModule {}
