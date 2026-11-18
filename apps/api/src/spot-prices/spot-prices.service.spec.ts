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

  it('fetches all daily history and returns prices with missing metals preserved', async () => {
    const prices = [
      { ts: 1767225600, gold: 3_000, silver: 30 },
      { ts: 1767312000, gold: 3_100 },
      { ts: 1767571200, silver: 31 },
    ];
    const data = { prices, meta: { range: 'ALL', granularity: 'daily' } };
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify(data), { status: 200 }));

    await expect(service.getHistoricalSpotPrices()).resolves.toEqual(prices);
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
      'https://api.stackfolio.app/api/spot-price/history?range=ALL&granularity=daily',
    );
  });

  it.each([{ gold: 0 }, { silver: -1 }, { gold: '3000' }, { silver: null }])(
    'rejects an invalid historical price after a valid row: %j',
    async (invalidPrice) => {
      const data = {
        prices: [
          { ts: 1767225600, gold: 3_000, silver: 30 },
          { ts: 1767312000, ...invalidPrice },
        ],
        meta: { range: 'ALL', granularity: 'daily' },
      };
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(data), { status: 200 }));

      await expect(service.getHistoricalSpotPrices()).rejects.toThrow('Invalid spot price.');
    },
  );

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

  it('rejects a historical timestamp outside the JavaScript Date range.', async () => {
    const data = {
      prices: [{ ts: Number.MAX_SAFE_INTEGER, gold: 3_000, silver: 30 }],
      meta: { range: 'ALL', granularity: 'daily' },
    };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(data), { status: 200 }));

    await expect(service.getHistoricalSpotPrices()).rejects.toThrow('Invalid historical price timestamp.');
  });

  it('preserves empty historical prices.', async () => {
    const data = {
      prices: [],
      meta: { range: 'ALL', granularity: 'daily' },
    };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(data), { status: 200 }));

    await expect(service.getHistoricalSpotPrices()).resolves.toEqual([]);
  });

  it('rejects non-daily history granularity.', async () => {
    const data = {
      prices: [],
      meta: { range: 'ALL', granularity: 'hourly' },
    };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(data), { status: 200 }));

    await expect(service.getHistoricalSpotPrices()).rejects.toThrow('Invalid spot price history metadata.');
  });

  it('rejects history ranges other than ALL.', async () => {
    const data = {
      prices: [],
      meta: { range: '1Y', granularity: 'daily' },
    };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(data), { status: 200 }));

    await expect(service.getHistoricalSpotPrices()).rejects.toThrow('Invalid spot price history metadata.');
  });

  it('rejects a null historical prices array.', async () => {
    const data = {
      prices: null,
      meta: { range: 'ALL', granularity: 'daily' },
    };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(data), { status: 200 }));

    await expect(service.getHistoricalSpotPrices()).rejects.toThrow('Invalid spot price history response.');
  });

  it('rejects a null history response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(null), { status: 200 }));

    await expect(service.getHistoricalSpotPrices()).rejects.toThrow('Invalid spot price history response.');
  });

  it('rejects fractional historical timestamps.', async () => {
    const data = {
      prices: [{ ts: 10.5 }],
      meta: { range: 'ALL', granularity: 'daily' },
    };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(data), { status: 200 }));

    await expect(service.getHistoricalSpotPrices()).rejects.toThrow('Invalid historical price timestamp.');
  });

  it('rejects negative historical timestamps.', async () => {
    const data = {
      prices: [{ ts: -10 }],
      meta: { range: 'ALL', granularity: 'daily' },
    };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(data), { status: 200 }));

    await expect(service.getHistoricalSpotPrices()).rejects.toThrow('Invalid historical price timestamp.');
  });
});
