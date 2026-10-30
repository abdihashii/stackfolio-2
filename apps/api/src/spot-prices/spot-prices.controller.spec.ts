import { Test, TestingModule } from '@nestjs/testing';

import { SpotPricesController } from './spot-prices.controller.js';

describe('SpotPricesController', () => {
  let controller: SpotPricesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SpotPricesController],
    }).compile();

    controller = module.get<SpotPricesController>(SpotPricesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
