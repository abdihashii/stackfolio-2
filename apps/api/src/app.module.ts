import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { Holding } from './holdings/entities/holding.entity.js';
import { HoldingsModule } from './holdings/holdings.module.js';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'stackfolio_user',
      password: 'stackfolio_password',
      database: 'stackfolio_db',
      entities: [Holding],
      synchronize: true,
    }),
    HoldingsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
