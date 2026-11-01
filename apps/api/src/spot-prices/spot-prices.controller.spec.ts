import { Test, TestingModule } from '@nestjs/testing';

import { SpotPricesController } from './spot-prices.controller.js';
import { SpotPricesService } from './spot-prices.service.js';

describe('SpotPricesController', () => {
  let controller: SpotPricesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SpotPricesController],
      providers: [SpotPricesService],
    }).compile();

    controller = module.get<SpotPricesController>(SpotPricesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
