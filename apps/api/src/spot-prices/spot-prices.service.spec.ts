import { Test, TestingModule } from '@nestjs/testing';
import { vi } from 'vitest';

import { SpotPricesService } from './spot-prices.service.js';

describe('SpotPricesService', () => {
  let service: SpotPricesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SpotPricesService],
    }).compile();

    service = module.get<SpotPricesService>(SpotPricesService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('rejects a null response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(null), { status: 200 }));

    await expect(service.getSpotPrices()).rejects.toThrow('Invalid spot prices response.');
  });
});
