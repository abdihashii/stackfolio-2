import { expect, test } from 'bun:test';
import assert from 'node:assert/strict';

import { isReceiptAmount, type Item } from '../types/inventory.types';

import { calculateBuySpotValue, calculateUnrealizedGain, formatUsd } from './utils';

test('currency formatting preserves the final cent of an exact receipt amount', () => {
  expect(formatUsd('0')).toBe('$0.00');
  expect(formatUsd('100')).toBe('$100.00');
  expect(formatUsd('100000000000000.01')).toBe('$100,000,000,000,000.01');
  const largeReceipt = `1${'000'.repeat(103)}.01`;
  assert(isReceiptAmount(largeReceipt));
  expect(formatUsd(largeReceipt)).toBe(`$1${',000'.repeat(103)}.01`);
  expect(formatUsd('.5')).toBe('$0.50');
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
  expect(calculateUnrealizedGain(100_000_000_000_000, '100000000000000.01')).toBe('-0.01');
});
