import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { databaseOptions } from './database-options.js';
import { InventoryModule } from './inventory/inventory.module.js';
import { SpotPricesModule } from './spot-prices/spot-prices.module.js';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      ...databaseOptions,
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
