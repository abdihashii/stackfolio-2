import { Module } from '@nestjs/common';
import { HoldingsService } from './holdings.service.js';
import { HoldingsController } from './holdings.controller.js';

@Module({
  controllers: [HoldingsController],
  providers: [HoldingsService],
})
export class HoldingsModule {}
