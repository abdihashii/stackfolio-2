import { expect, test } from 'bun:test';

import { buySchema } from './form.schema';

test('the buy form omits blank amounts and preserves entered decimal text', () => {
  const amount = buySchema.shape.total_paid;
  expect(amount.parse('')).toBeUndefined();
  expect(amount.parse('   ')).toBeUndefined();
  expect(amount.parse('0')).toBe('0');
  expect(amount.parse(' 100.25 ')).toBe('100.25');
  expect(amount.parse('100000000000000.01')).toBe('100000000000000.01');
});

test.each(['-1', '12.345', '0x10', '1e-7'])('the buy form rejects %s', (raw) => {
  expect(buySchema.shape.total_paid.safeParse(raw).success).toBe(false);
});
