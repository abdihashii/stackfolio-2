import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Holding } from './entities/holding.entity.js';
import { HoldingsController } from './holdings.controller.js';
import { HoldingsService } from './holdings.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Holding])],
  controllers: [HoldingsController],
  providers: [HoldingsService],
})
export class HoldingsModule {}
