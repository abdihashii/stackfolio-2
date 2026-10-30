import { Test, TestingModule } from '@nestjs/testing';

import { SpotPricesService } from './spot-prices.service.js';

describe('SpotPricesService', () => {
  let service: SpotPricesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SpotPricesService],
    }).compile();

    service = module.get<SpotPricesService>(SpotPricesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
