import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { HoldingsModule } from './holdings/holdings.module.js';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: "better-sqlite3"
    }),
    HoldingsModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
