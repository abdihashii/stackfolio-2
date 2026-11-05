import { Module } from '@nestjs/common';

import { SpotPricesController } from './spot-prices.controller.js';
import { SpotPricesService } from './spot-prices.service.js';

@Module({
  providers: [SpotPricesService],
  controllers: [SpotPricesController],
  exports: [SpotPricesService],
})
export class SpotPricesModule {}
