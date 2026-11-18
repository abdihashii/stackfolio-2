import type { Item } from './entities/item.entity.js';
import type { Transaction } from './entities/transaction.entity.js';

import { calculateHistoricalValue } from './historical-value.js';

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
      item,
      buy: null,
    };
    const sales: Transaction[] = [2, 3, 4].map((day) => ({
      id: `test-sale-${day}`,
      created_at: new Date(`2026-01-0${day}T00:00:00Z`),
      effective_date: `2026-01-0${day}`,
      type: 'sell',
      quantity: 1,
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
      item,
      buy: null,
    };
    const sale: Transaction = {
      id: 'test-sale',
      created_at: new Date('2026-01-01T15:00:00Z'),
      effective_date: '2026-01-01',
      type: 'sell',
      quantity: 1,
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
      item,
      buy: null,
    };
    const sale: Transaction = {
      id: 'test-sale',
      created_at: new Date('2026-03-02T00:00:00Z'),
      effective_date: '2026-03-01',
      type: 'sell',
      quantity: 1,
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
      item,
      buy: null,
    };
    const sale: Transaction = {
      id: 'test-sale',
      created_at: new Date('2026-03-01T00:00:00Z'),
      effective_date: '2026-03-01',
      type: 'sell',
      quantity: 3,
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
      item: gold,
      buy: null,
    };
    const silverBuy: Transaction = {
      id: 'silver-buy',
      created_at: new Date('2026-01-02T00:00:00Z'),
      effective_date: '2026-01-05',
      type: 'buy',
      quantity: 1,
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
      item,
      buy: null,
    };

    // Two fine-metal troy ounces × three items × $3,000.
    expect(calculateHistoricalValue([buy], '2026-01-02', { gold: 3000 })).toBeCloseTo(18000, 2);
  });
});
