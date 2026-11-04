import type { ItemWithQuantity } from './inventory.service.js';

import { calculateHistoricalValue } from './historical-value.js';

describe('calculateHistoricalValue', () => {
  it('includes a item from its acquisition date onward', () => {
    const item: ItemWithQuantity = {
      id: 'test-gold',
      created_at: new Date('2026-01-05T12:00:00Z'),
      quantity: 1,
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

    expect(calculateHistoricalValue([item], '2026-01-01', { gold: 3000 })).toBe(0);
    expect(calculateHistoricalValue([item], '2026-01-02', { gold: 3000 })).toBe(3000);
  });

  it('uses the UTC added date when the acquisition date is missing', () => {
    const item: ItemWithQuantity = {
      id: 'test-gold',
      created_at: new Date('2026-01-04T23:30:00-06:00'),
      quantity: 1,
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

    expect(calculateHistoricalValue([item], '2026-01-04', { gold: 3000 })).toBe(0);
    expect(calculateHistoricalValue([item], '2026-01-05', { gold: 3000 })).toBe(3000);
  });

  it('returns no partial total when an eligible item has no price', () => {
    const gold: ItemWithQuantity = {
      id: 'test-gold',
      created_at: new Date('2026-01-02T00:00:00Z'),
      quantity: 1,
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
    const silver: ItemWithQuantity = {
      ...gold,
      id: 'test-silver',
      item_type: { ...gold.item_type, id: 'test-silver-type', name: 'Test silver', metal: 'silver' },
      acquisition_date: '2026-01-05',
    };

    expect(calculateHistoricalValue([gold, silver], '2026-01-02', { gold: 3000 })).toBe(3000);
    expect(calculateHistoricalValue([gold, silver], '2026-01-05', { gold: 3000 })).toBeNull();
    expect(calculateHistoricalValue([gold, silver], '2026-01-05', { gold: 3000, silver: 30 })).toBe(3030);
  });

  it('converts grams and applies purity and quantity', () => {
    const item: ItemWithQuantity = {
      id: 'test-gold',
      created_at: new Date('2026-01-02T00:00:00Z'),
      quantity: 3,
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

    // Two troy ounces × 75% purity × three items × $3,000.
    expect(calculateHistoricalValue([item], '2026-01-02', { gold: 3000 })).toBeCloseTo(13500, 2);
  });
});
