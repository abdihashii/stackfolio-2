import '../../test/setup-dom';
import { afterEach, expect, mock, test } from 'bun:test';

import { cleanup, fireEvent, render } from '@testing-library/react';

import type { Transaction } from '@/types/inventory.types';

import { EditTransactionForm } from './edit-transaction-form';

const buy: Transaction = {
  id: 'buy',
  type: 'buy',
  quantity: 3,
  effective_date: '2026-11-01',
  created_at: '2026-11-01',
  total_paid: '100.00',
};
const reminder = 'Check the purchase total. We’ll divide it across the updated quantity.';

afterEach(cleanup);

function renderBuy() {
  const onSave = mock();
  const view = render(
    <EditTransactionForm transaction={buy} disabled={false} isSaving={false} onSave={onSave} onCancel={() => {}} />,
  );
  return { view, onSave };
}

test('shows the receipt reminder until the original quantity is restored', () => {
  const { view } = renderBuy();
  const quantity = view.getByLabelText('Quantity:');

  expect(view.queryByText(reminder)).toBeNull();
  fireEvent.change(quantity, { target: { value: '4' } });
  expect(view.queryByText(reminder)).not.toBeNull();
  fireEvent.change(quantity, { target: { value: '3' } });
  expect(view.queryByText(reminder)).toBeNull();
});

test('a date-only edit submits only the date change', () => {
  const { view, onSave } = renderBuy();
  fireEvent.change(view.getByLabelText('Effective date:'), { target: { value: '2026-11-02' } });
  expect(view.queryByText(reminder)).toBeNull();
  fireEvent.click(view.getByRole('button', { name: 'Save' }));

  expect(onSave).toHaveBeenCalledTimes(1);
  expect(onSave).toHaveBeenCalledWith({ effective_date: '2026-11-02', quantity: undefined, total_paid: undefined });
});

test('shows the reminder when a remount restores a changed quantity', () => {
  const view = render(
    <EditTransactionForm
      transaction={buy}
      submittedChanges={{ quantity: 4 }}
      disabled={false}
      isSaving={false}
      onSave={mock()}
      onCancel={mock()}
    />,
  );

  expect(view.getByText(reminder)).toBeTruthy();
});
