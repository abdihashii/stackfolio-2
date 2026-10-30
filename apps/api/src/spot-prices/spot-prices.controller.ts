import { Controller, Get, Param, ParseEnumPipe } from '@nestjs/common';

import { SpotPricesService } from './spot-prices.service.js';

enum Metal {
  Gold = 'gold',
  Silver = 'silver',
}

@Controller('spot-prices')
export class SpotPricesController {
  constructor(private readonly spotPricesService: SpotPricesService) {}

  @Get(':metal')
  getSpotPriceByMetal(@Param('metal', new ParseEnumPipe(Metal)) metal: 'gold' | 'silver') {
    return this.spotPricesService.getSpotPriceByMetal(metal);
  }
}
