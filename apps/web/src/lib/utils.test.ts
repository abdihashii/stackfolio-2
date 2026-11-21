import { expect, test } from 'bun:test';
import assert from 'node:assert/strict';

import { isReceiptAmount } from '../types/inventory.types';

import { formatUsd } from './utils';

test('currency formatting preserves the final cent of an exact receipt amount', () => {
  expect(formatUsd('0')).toBe('$0.00');
  expect(formatUsd('100')).toBe('$100.00');
  expect(formatUsd('100000000000000.01')).toBe('$100,000,000,000,000.01');
  const largeReceipt = `1${'000'.repeat(103)}.01`;
  assert(isReceiptAmount(largeReceipt));
  expect(formatUsd(largeReceipt)).toBe(`$1${',000'.repeat(103)}.01`);
  expect(formatUsd('.5')).toBe('$0.50');
});
