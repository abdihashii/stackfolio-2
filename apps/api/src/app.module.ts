import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ItemType } from './inventory/entities/item-type.entity.js';
import { Item } from './inventory/entities/item.entity.js';
import { Transaction } from './inventory/entities/transaction.entity.js';
import { InventoryModule } from './inventory/inventory.module.js';
import { SpotPricesModule } from './spot-prices/spot-prices.module.js';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'stackfolio_user',
      password: 'stackfolio_password',
      database: 'stackfolio_db',
      entities: [Item, ItemType, Transaction],
      synchronize: true,
    }),
    InventoryModule,
    SpotPricesModule,
    ConfigModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
