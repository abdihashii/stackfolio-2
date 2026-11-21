import type { Item } from './entities/item.entity.js';
import type { Transaction } from './entities/transaction.entity.js';

import { calculateDailyStackValues, calculateHistoricalValue } from './historical-value.js';

describe('calculateHistoricalValue', () => {
  it('returns zero after selling three 5-gram bars individually without prices', () => {
    const item: Item = {
      id: 'test-gold-bar',
      created_at: new Date('2026-01-01T00:00:00Z'),
      acquisition_date: '2026-01-01',
      item_type: {
        id: 'test-gold-bar-type',
        name: '5 gram gold bar',
        metal: 'gold',
        weight_unit: 'gram',
        weight: 5,
        purity: 0.9999,
      },
    };
    const buy: Transaction = {
      id: 'test-buy',
      created_at: new Date('2026-01-01T00:00:00Z'),
      effective_date: '2026-01-01',
      type: 'buy',
      quantity: 3,
      total_paid: null,
      item,
      buy: null,
    };
    const sales: Transaction[] = [2, 3, 4].map((day) => ({
      id: `test-sale-${day}`,
      created_at: new Date(`2026-01-0${day}T00:00:00Z`),
      effective_date: `2026-01-0${day}`,
      type: 'sell',
      quantity: 1,
      total_paid: null,
      item,
      buy,
    }));
    const transactions = [buy, ...sales];

    expect(calculateHistoricalValue(transactions, '2026-01-03', {})).toBeNull();
    expect(calculateHistoricalValue(transactions, '2026-01-04', {})).toBe(0);
    expect(calculateHistoricalValue([...transactions].reverse(), '2026-01-04', {})).toBe(0);
  });

  it('includes both a buy and sale effective on the cutoff date', () => {
    const item: Item = {
      id: 'test-silver',
      created_at: new Date('2026-01-01T09:00:00Z'),
      acquisition_date: '2026-01-01',
      item_type: {
        id: 'test-silver-type',
        name: 'Test silver',
        metal: 'silver',
        weight_unit: 'ozt',
        weight: 1,
        purity: 1,
      },
    };
    const buy: Transaction = {
      id: 'test-buy',
      created_at: new Date('2026-01-01T09:00:00Z'),
      effective_date: '2026-01-01',
      type: 'buy',
      quantity: 3,
      total_paid: null,
      item,
      buy: null,
    };
    const sale: Transaction = {
      id: 'test-sale',
      created_at: new Date('2026-01-01T15:00:00Z'),
      effective_date: '2026-01-01',
      type: 'sell',
      quantity: 1,
      total_paid: null,
      item,
      buy,
    };

    expect(calculateHistoricalValue([buy, sale], '2025-12-31', { silver: 30 })).toBe(0);
    expect(calculateHistoricalValue([buy, sale], '2026-01-01', { silver: 30 })).toBe(60);
    expect(calculateHistoricalValue([sale, buy], '2026-01-01', { silver: 30 })).toBe(60);
  });

  it('reduces value from the sale effective date without changing earlier values', () => {
    const item: Item = {
      id: 'test-silver',
      created_at: new Date('2026-01-01T00:00:00Z'),
      acquisition_date: '2026-01-01',
      item_type: {
        id: 'test-silver-type',
        name: 'Test silver',
        metal: 'silver',
        weight_unit: 'ozt',
        weight: 1,
        purity: 1,
      },
    };
    const buy: Transaction = {
      id: 'test-buy',
      created_at: new Date('2026-01-01T00:00:00Z'),
      effective_date: '2026-01-01',
      type: 'buy',
      quantity: 3,
      total_paid: null,
      item,
      buy: null,
    };
    const sale: Transaction = {
      id: 'test-sale',
      created_at: new Date('2026-03-02T00:00:00Z'),
      effective_date: '2026-03-01',
      type: 'sell',
      quantity: 1,
      total_paid: null,
      item,
      buy,
    };
    const transactions = [buy, sale];

    expect(calculateHistoricalValue(transactions, '2026-02-28', { silver: 30 })).toBe(90);
    expect(calculateHistoricalValue(transactions, '2026-03-01', { silver: 30 })).toBe(60);
    expect(calculateHistoricalValue(transactions, '2026-03-02', { silver: 30 })).toBe(60);
  });

  it('returns zero on and after full liquidation without requiring a price', () => {
    const item: Item = {
      id: 'test-silver',
      created_at: new Date('2026-01-01T00:00:00Z'),
      acquisition_date: '2026-01-01',
      item_type: {
        id: 'test-silver-type',
        name: 'Test silver',
        metal: 'silver',
        weight_unit: 'ozt',
        weight: 1,
        purity: 1,
      },
    };
    const buy: Transaction = {
      id: 'test-buy',
      created_at: new Date('2026-01-01T00:00:00Z'),
      effective_date: '2026-01-01',
      type: 'buy',
      quantity: 3,
      total_paid: null,
      item,
      buy: null,
    };
    const sale: Transaction = {
      id: 'test-sale',
      created_at: new Date('2026-03-01T00:00:00Z'),
      effective_date: '2026-03-01',
      type: 'sell',
      quantity: 3,
      total_paid: null,
      item,
      buy,
    };
    const transactions = [buy, sale];

    expect(calculateHistoricalValue(transactions, '2026-02-28', { silver: 30 })).toBe(90);
    expect(calculateHistoricalValue(transactions, '2026-02-28', {})).toBeNull();
    expect(calculateHistoricalValue(transactions, '2026-03-01', {})).toBe(0);
    expect(calculateHistoricalValue(transactions, '2026-03-02', {})).toBe(0);
  });

  it('includes a buy from its effective date onward', () => {
    const item: Item = {
      id: 'test-gold',
      created_at: new Date('2026-01-05T12:00:00Z'),
      item_type: {
        id: 'test-gold-type',
        name: 'Test gold',
        metal: 'gold',
        weight_unit: 'ozt',
        weight: 1,
        purity: 1,
      },
      acquisition_date: '2026-01-02',
    };

    const buy: Transaction = {
      id: 'test-buy',
      created_at: new Date('2026-01-05T12:00:00Z'),
      effective_date: '2026-01-02',
      type: 'buy',
      quantity: 1,
      total_paid: null,
      item,
      buy: null,
    };

    expect(calculateHistoricalValue([buy], '2026-01-01', { gold: 3000 })).toBe(0);
    expect(calculateHistoricalValue([buy], '2026-01-02', { gold: 3000 })).toBe(3000);
  });

  it('uses the saved effective date when the item acquisition date is missing', () => {
    const item: Item = {
      id: 'test-gold',
      created_at: new Date('2026-01-04T23:30:00-06:00'),
      item_type: {
        id: 'test-gold-type',
        name: 'Test gold',
        metal: 'gold',
        weight_unit: 'ozt',
        weight: 1,
        purity: 1,
      },
      acquisition_date: null,
    };

    const buy: Transaction = {
      id: 'test-buy',
      created_at: new Date('2026-01-04T23:30:00-06:00'),
      effective_date: '2026-01-05',
      type: 'buy',
      quantity: 1,
      total_paid: null,
      item,
      buy: null,
    };

    expect(calculateHistoricalValue([buy], '2026-01-04', { gold: 3000 })).toBe(0);
    expect(calculateHistoricalValue([buy], '2026-01-05', { gold: 3000 })).toBe(3000);
  });

  it('returns no partial total when a held metal has no price', () => {
    const gold: Item = {
      id: 'test-gold',
      created_at: new Date('2026-01-02T00:00:00Z'),
      item_type: {
        id: 'test-gold-type',
        name: 'Test gold',
        metal: 'gold',
        weight_unit: 'ozt',
        weight: 1,
        purity: 1,
      },
      acquisition_date: '2026-01-02',
    };
    const silver: Item = {
      id: 'test-silver',
      created_at: new Date('2026-01-02T00:00:00Z'),
      item_type: {
        id: 'test-silver-type',
        name: 'Test silver',
        metal: 'silver',
        weight_unit: 'ozt',
        weight: 1,
        purity: 1,
      },
      acquisition_date: '2026-01-05',
    };

    const goldBuy: Transaction = {
      id: 'gold-buy',
      created_at: new Date('2026-01-02T00:00:00Z'),
      effective_date: '2026-01-02',
      type: 'buy',
      quantity: 1,
      total_paid: null,
      item: gold,
      buy: null,
    };
    const silverBuy: Transaction = {
      id: 'silver-buy',
      created_at: new Date('2026-01-02T00:00:00Z'),
      effective_date: '2026-01-05',
      type: 'buy',
      quantity: 1,
      total_paid: null,
      item: silver,
      buy: null,
    };

    expect(calculateHistoricalValue([goldBuy, silverBuy], '2026-01-02', { gold: 3000 })).toBe(3000);
    expect(calculateHistoricalValue([goldBuy, silverBuy], '2026-01-05', { gold: 3000 })).toBeNull();
    expect(calculateHistoricalValue([goldBuy, silverBuy], '2026-01-05', { gold: 3000, silver: 30 })).toBe(3030);
  });

  it('converts fine-metal grams and applies quantity without applying purity again', () => {
    const item: Item = {
      id: 'test-gold',
      created_at: new Date('2026-01-02T00:00:00Z'),
      item_type: {
        id: 'test-gold-type',
        name: 'Test gold',
        metal: 'gold',
        weight_unit: 'gram',
        weight: 62.2069536,
        purity: 0.75,
      },
      acquisition_date: '2026-01-02',
    };

    const buy: Transaction = {
      id: 'test-buy',
      created_at: new Date('2026-01-02T00:00:00Z'),
      effective_date: '2026-01-02',
      type: 'buy',
      quantity: 3,
      total_paid: null,
      item,
      buy: null,
    };

    // Two fine-metal troy ounces × three items × $3,000.
    expect(calculateHistoricalValue([buy], '2026-01-02', { gold: 3000 })).toBeCloseTo(18000, 2);
  });
});

describe('calculateDailyStackValues', () => {
  it('matches every value in the two-year silver example', () => {
    const purchases = [
      { date: '2024-01-01', name: 'Silver Eagle', quantity: 3 },
      { date: '2024-07-01', name: 'Silver Maple', quantity: 2 },
      { date: '2025-01-01', name: 'Silver Eagle', quantity: 2 },
    ];
    const buys: Transaction[] = purchases.map(({ date, name, quantity }) => ({
      id: `buy-${date}`,
      created_at: new Date(date),
      effective_date: date,
      type: 'buy',
      quantity,
      total_paid: null,
      buy: null,
      item: {
        id: `item-${date}`,
        created_at: new Date(date),
        acquisition_date: date,
        item_type: {
          id: name,
          name,
          metal: 'silver',
          weight_unit: 'ozt',
          weight: 1,
          purity: 0.999,
        },
      },
    }));
    const firstBuy = buys[0]!;
    const sale: Transaction = {
      id: 'sell-first-eagle',
      created_at: new Date('2025-07-01'),
      effective_date: '2025-07-01',
      type: 'sell',
      quantity: 1,
      total_paid: null,
      item: firstBuy.item,
      buy: firstBuy,
    };
    const prices = Object.entries({
      '2024-01-01': 24,
      '2024-06-30': 30,
      '2024-12-31': 28,
      '2025-01-01': 32,
      '2025-06-30': 30,
      '2025-12-31': 40,
    }).map(([date, silver]) => ({ ts: Date.parse(date) / 1_000, silver }));

    const points = calculateDailyStackValues([...buys, sale], '2024-01-01', '2025-12-31', prices);
    const valuesByDate = Object.fromEntries(points.map(({ date, totalValue }) => [date, totalValue]));

    expect(valuesByDate).toMatchObject({
      '2024-01-01': 72,
      '2024-06-30': 90,
      '2024-07-01': 150,
      '2024-12-31': 140,
      '2025-01-01': 224,
      '2025-06-30': 210,
      '2025-07-01': 180,
      '2025-12-31': 240,
    });
  });

  it('recalculates daily values after correcting a purchase quantity and effective date', () => {
    const item: Item = {
      id: 'test-silver',
      created_at: new Date('2026-01-01T00:00:00Z'),
      acquisition_date: '2026-01-01',
      item_type: {
        id: 'test-silver-type',
        name: 'Test silver',
        metal: 'silver',
        weight_unit: 'ozt',
        weight: 1,
        purity: 0.999,
      },
    };
    const buy: Transaction = {
      id: 'test-buy',
      created_at: new Date('2026-01-01T00:00:00Z'),
      effective_date: '2026-01-01',
      type: 'buy',
      quantity: 2,
      total_paid: null,
      item,
      buy: null,
    };
    const ts = Date.parse('2026-01-01T12:00:00Z') / 1_000;
    const prices = [{ ts, silver: 30 }];

    expect(calculateDailyStackValues([buy], '2026-01-01', '2026-01-02', prices)).toEqual([
      { date: '2026-01-01', totalValue: 60, quoteTimestamps: { silver: ts } },
      { date: '2026-01-02', totalValue: 60, quoteTimestamps: { silver: ts } },
    ]);

    buy.quantity = 3;

    expect(calculateDailyStackValues([buy], '2026-01-01', '2026-01-02', prices)).toEqual([
      { date: '2026-01-01', totalValue: 90, quoteTimestamps: { silver: ts } },
      { date: '2026-01-02', totalValue: 90, quoteTimestamps: { silver: ts } },
    ]);

    buy.effective_date = '2026-01-02';

    expect(calculateDailyStackValues([buy], '2026-01-01', '2026-01-02', prices)).toEqual([
      { date: '2026-01-01', totalValue: 0, quoteTimestamps: { silver: ts } },
      { date: '2026-01-02', totalValue: 90, quoteTimestamps: { silver: ts } },
    ]);
  });

  it('includes leap day between February 28 and March 1', () => {
    const item: Item = {
      id: 'test-silver',
      created_at: new Date('2024-02-28T00:00:00Z'),
      acquisition_date: '2024-02-28',
      item_type: {
        id: 'test-silver-type',
        name: 'Test silver',
        metal: 'silver',
        weight_unit: 'ozt',
        weight: 1,
        purity: 0.999,
      },
    };
    const buy: Transaction = {
      id: 'test-buy',
      created_at: new Date('2024-02-28T00:00:00Z'),
      effective_date: '2024-02-28',
      type: 'buy',
      quantity: 2,
      total_paid: null,
      item,
      buy: null,
    };
    const ts = Date.parse('2024-02-28T12:00:00Z') / 1_000;

    expect(calculateDailyStackValues([buy], '2024-02-28', '2024-03-01', [{ ts, silver: 30 }])).toEqual([
      { date: '2024-02-28', totalValue: 60, quoteTimestamps: { silver: ts } },
      { date: '2024-02-29', totalValue: 60, quoteTimestamps: { silver: ts } },
      { date: '2024-03-01', totalValue: 60, quoteTimestamps: { silver: ts } },
    ]);
  });

  it('uses holdings and the latest quote from before the requested range', () => {
    const item: Item = {
      id: 'test-silver',
      created_at: new Date('2025-12-30T00:00:00Z'),
      acquisition_date: '2025-12-30',
      item_type: {
        id: 'test-silver-type',
        name: 'Test silver',
        metal: 'silver',
        weight_unit: 'ozt',
        weight: 1,
        purity: 0.999,
      },
    };
    const buy: Transaction = {
      id: 'test-buy',
      created_at: new Date('2025-12-30T00:00:00Z'),
      effective_date: '2025-12-30',
      type: 'buy',
      quantity: 2,
      total_paid: null,
      item,
      buy: null,
    };
    const ts = Date.parse('2026-01-01T12:00:00Z') / 1_000;
    const olderTs = Date.parse('2025-12-31T12:00:00Z') / 1_000;

    expect(
      calculateDailyStackValues([buy], '2026-01-05', '2026-01-06', [
        { ts, silver: 30 },
        { ts: olderTs, silver: 25 },
      ]),
    ).toEqual([
      { date: '2026-01-05', totalValue: 60, quoteTimestamps: { silver: ts } },
      { date: '2026-01-06', totalValue: 60, quoteTimestamps: { silver: ts } },
    ]);
  });

  it('carries silver independently when only gold updates and preserves earlier timestamps', () => {
    const gold: Item = {
      id: 'test-gold',
      created_at: new Date('2025-12-30T00:00:00Z'),
      acquisition_date: '2025-12-30',
      item_type: {
        id: 'test-gold-type',
        name: 'Test gold',
        metal: 'gold',
        weight_unit: 'ozt',
        weight: 1,
        purity: 0.9167,
      },
    };
    const silver: Item = {
      id: 'test-silver',
      created_at: new Date('2025-12-30T00:00:00Z'),
      acquisition_date: '2025-12-30',
      item_type: {
        id: 'test-silver-type',
        name: 'Test silver',
        metal: 'silver',
        weight_unit: 'ozt',
        weight: 1,
        purity: 0.999,
      },
    };
    const transactions: Transaction[] = [gold, silver].map((item) => ({
      id: `buy-${item.id}`,
      created_at: new Date('2025-12-30T00:00:00Z'),
      effective_date: '2025-12-30',
      type: 'buy',
      quantity: 1,
      total_paid: null,
      item,
      buy: null,
    }));
    const firstTs = Date.parse('2026-01-01T12:00:00Z') / 1_000;
    const secondTs = Date.parse('2026-01-02T12:00:00Z') / 1_000;

    expect(
      calculateDailyStackValues(transactions, '2026-01-01', '2026-01-02', [
        { ts: firstTs, gold: 3000, silver: 30 },
        { ts: secondTs, gold: 3100 },
      ]),
    ).toEqual([
      {
        date: '2026-01-01',
        totalValue: 3030,
        quoteTimestamps: { gold: firstTs, silver: firstTs },
      },
      {
        date: '2026-01-02',
        totalValue: 3130,
        quoteTimestamps: { gold: secondTs, silver: firstTs },
      },
    ]);
  });

  it('values pre-range holdings without future quotes and carries the first available quote forward', () => {
    const item: Item = {
      id: 'test-silver',
      created_at: new Date('2025-12-30T00:00:00Z'),
      acquisition_date: '2025-12-30',
      item_type: {
        id: 'test-silver-type',
        name: 'Test silver',
        metal: 'silver',
        weight_unit: 'ozt',
        weight: 1,
        purity: 0.999,
      },
    };
    const buy: Transaction = {
      id: 'test-buy',
      created_at: new Date('2025-12-30T00:00:00Z'),
      effective_date: '2025-12-30',
      type: 'buy',
      quantity: 2,
      total_paid: null,
      item,
      buy: null,
    };
    const ts = Date.parse('2026-01-01T12:00:00Z') / 1_000;

    expect(calculateDailyStackValues([buy], '2025-12-31', '2026-01-03', [{ ts, silver: 30 }])).toEqual([
      { date: '2025-12-31', totalValue: null, quoteTimestamps: {} },
      { date: '2026-01-01', totalValue: 60, quoteTimestamps: { silver: ts } },
      { date: '2026-01-02', totalValue: 60, quoteTimestamps: { silver: ts } },
      { date: '2026-01-03', totalValue: 60, quoteTimestamps: { silver: ts } },
    ]);
  });
});
