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

  it('accepts a valid response', async () => {
    const data = {
      timestamp: '2026-01-01T00:00:00.000Z',
      currency: 'USD',
      unit: 'toz',
      prices: {
        gold: 3_000,
        silver: 30,
      },
      source: 'database',
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(data), { status: 200 }));

    await expect(service.getSpotPrices()).resolves.toEqual(data);
  });

  it('rejects a null prices object', async () => {
    const data = {
      timestamp: '2026-01-01T00:00:00.000Z',
      currency: 'USD',
      unit: 'toz',
      prices: null,
      source: 'database',
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(data), { status: 200 }));

    await expect(service.getSpotPrices()).rejects.toThrow('Invalid spot prices.');
  });

  it('rejects a null gold spot price', async () => {
    const data = {
      timestamp: '2026-01-01T00:00:00.000Z',
      currency: 'USD',
      unit: 'toz',
      prices: {
        gold: null,
        silver: 30,
      },
      source: 'database',
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(data), { status: 200 }));

    await expect(service.getSpotPrices()).rejects.toThrow('Invalid gold price.');
  });

  it('rejects mock prices', async () => {
    const data = {
      timestamp: '2026-01-01T00:00:00.000Z',
      currency: 'USD',
      unit: 'toz',
      prices: {
        gold: 3_000,
        silver: 30,
      },
      source: 'mock',
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(data), { status: 200 }));

    await expect(service.getSpotPrices()).rejects.toThrow('Live spot prices unavailable.');
  });
});
