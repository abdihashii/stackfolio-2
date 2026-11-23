import { expect, test } from 'bun:test';

import type { Item } from '../types/inventory.types';

import { calculateBuySpotValue, calculateStackUnrealizedGain, calculateUnrealizedGain, formatUsd } from './utils';

test('currency formatting preserves the final cent of an exact receipt amount', () => {
  expect(formatUsd('0')).toBe('$0.00');
  expect(formatUsd('100')).toBe('$100.00');
  expect(formatUsd('100000000000000.01')).toBe('$100,000,000,000,000.01');
  const largeReceipt = `1${'000'.repeat(103)}.01`;
  expect(formatUsd(largeReceipt)).toBe(`$1${',000'.repeat(103)}.01`);
  expect(formatUsd('.5')).toBe('$0.50');
});

test.each([
  ['-0.25', '-$0.25'],
  ['-1234.56', '-$1,234.56'],
] as const)('formats a loss of %s as %s', (input, expected) => {
  expect(formatUsd(input)).toBe(expected);
});

test('buy spot value uses the remaining quantity', () => {
  const item: Item = {
    id: 'item', created_at: new Date(0), acquisition_date: null, quantity: 3,
    item_type: { id: 'round', name: 'Silver round', metal: 'silver', weight: 1, weight_unit: 'ozt', purity: 1 },
  };
  expect(calculateBuySpotValue(item, 2, 40)).toBe('80');
  const spot = calculateBuySpotValue(item, 3, 20.025);
  expect(spot).toBe('60.075');
  expect(calculateUnrealizedGain(spot, '60')).toBe('0.075');
});

test('unrealized gain preserves a one-cent loss on a large receipt', () => {
  const loss = calculateUnrealizedGain(100_000_000_000_000, '100000000000000.01');
  expect(loss).toBe('-0.01');
  expect(formatUsd(loss)).toBe('-$0.01');
});

for (const field of ['remaining_purchase_cost', 'spotValue'] as const) {
  test(`missing ${field} makes stack gain unavailable until the buy is fully sold`, () => {
    const knownBuy = { remaining_quantity: 1, remaining_purchase_cost: '45', spotValue: '40' };
    const incompleteBuy = { ...knownBuy, [field]: null };

    expect(calculateStackUnrealizedGain([knownBuy, incompleteBuy])).toBeNull();
    expect(calculateStackUnrealizedGain([{ ...incompleteBuy, remaining_quantity: 0 }, knownBuy])).toBe('-5');
  });
}
