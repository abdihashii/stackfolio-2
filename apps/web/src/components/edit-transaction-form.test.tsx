import { expect, test } from 'bun:test';

import { renderToStaticMarkup } from 'react-dom/server';

import type { Transaction } from '@/types/inventory.types';

import { EditTransactionForm } from './edit-transaction-form';

test('a remounted edit form displays the submitted amount while saving and after rejection', () => {
  const transaction: Transaction = {
    id: 'buy-1',
    type: 'buy',
    effective_date: '2026-11-01',
    created_at: '2026-11-01T00:00:00Z',
    quantity: 2,
    total_paid: '50.00',
  };
  for (const isSaving of [true, false]) {
    for (const amount of ['51.00', null]) {
      const html = renderToStaticMarkup(
        <EditTransactionForm
          transaction={transaction}
          submittedChanges={{ total_paid: amount }}
          disabled={isSaving}
          isSaving={isSaving}
          errorMessage={isSaving ? undefined : 'Save failed'}
          onSave={() => {}}
          onCancel={() => {}}
        />,
      );
      const input = html.match(/<input [^>]*name="total_paid"[^>]*>/)?.[0];
      expect(input).toContain(`value="${amount ?? ''}"`);
    }
  }
});
