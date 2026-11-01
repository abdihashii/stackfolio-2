import { Controller, Get } from '@nestjs/common';

import { SpotPricesService } from './spot-prices.service.js';

@Controller('spot-prices')
export class SpotPricesController {
  constructor(private readonly spotPricesService: SpotPricesService) {}

  @Get()
  getSpotPrices() {
    return this.spotPricesService.getSpotPrices();
  }
}
