import { Module } from '@nestjs/common';

import { SpotPricesService } from './spot-prices.service.js';

@Module({
  providers: [SpotPricesService],
  exports: [SpotPricesService],
})
export class SpotPricesModule {}
