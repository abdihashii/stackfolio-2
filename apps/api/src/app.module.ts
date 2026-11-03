import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { Item } from './holdings/entities/item.entity.js';
import { InventoryModule } from './holdings/inventory.module.js';
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
      entities: [Item],
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
