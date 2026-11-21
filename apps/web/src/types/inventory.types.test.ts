import { expect, test } from 'bun:test';

import { transactionListSchema } from './inventory.types';

const row = {
  id: 'buy-1',
  type: 'buy',
  quantity: 1,
  created_at: '2026-01-01T00:00:00Z',
  effective_date: '2026-01-01',
};

test('the transaction response distinguishes unknown, zero, and exact decimal text', () => {
  for (const total_paid of [null, '0', '100000000000000.01'] as const) {
    const response = transactionListSchema.parse({ transactions: [{ ...row, total_paid }], total: 1 });
    expect(response.transactions[0].total_paid).toBe(total_paid);
  }
  for (const total_paid of [undefined, 0, '12.345']) {
    expect(transactionListSchema.safeParse({ transactions: [{ ...row, total_paid }], total: 1 }).success).toBe(false);
  }
});
