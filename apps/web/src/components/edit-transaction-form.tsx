import { type SubmitEventHandler, useState } from 'react';

import type { updateTransaction } from '@/lib/apis';
import type { Transaction } from '@/types/inventory.types';

type TransactionChanges = Parameters<typeof updateTransaction>[2];

type EditTransactionFormProps = {
  transaction: Transaction;
  submittedChanges?: TransactionChanges;
  disabled: boolean;
  isSaving: boolean;
  errorMessage?: string;
  onSave: (payload: TransactionChanges) => void;
  onCancel: () => void;
};

export const EditTransactionForm = ({
  transaction,
  submittedChanges,
  disabled,
  isSaving,
  errorMessage,
  onSave,
  onCancel,
}: EditTransactionFormProps) => {
  const initialQuantity = submittedChanges?.quantity ?? transaction.quantity;
  const [quantityChange, setQuantityChanged] = useState(initialQuantity !== transaction.quantity);

  const handleSubmit: SubmitEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();

    if (disabled) return;

    const data = new FormData(event.currentTarget);

    // Omit quantity from the PATCH unless the user changed it.
    const rawQuantity = Number(data.get('quantity'));
    let quantity: number | undefined;
    if (rawQuantity !== transaction.quantity) {
      quantity = rawQuantity;
    }

    // Omit effective date from the PATCH unless the user changed it.
    const rawEffectiveDate = data.get('effective_date');
    let effectiveDate: string | undefined;
    if (typeof rawEffectiveDate === 'string' && rawEffectiveDate !== transaction.effective_date) {
      effectiveDate = rawEffectiveDate;
    }

    // Leave totalPaid undefined to omit it from the PATCH when the field is absent or unchanged.
    // If the user clears a saved amount, send null so it shows as Unknown.
    const rawTotalPaid = data.get('total_paid');
    let totalPaid: string | null | undefined;
    if (typeof rawTotalPaid === 'string') {
      const trimmed = rawTotalPaid.trim();
      if (trimmed !== (transaction.total_paid ?? '')) totalPaid = trimmed || null;
    }

    onSave({
      quantity,
      effective_date: effectiveDate,
      total_paid: totalPaid,
    });
  };

  return (
    <form className="flex flex-col gap-2" onSubmit={handleSubmit}>
      <label htmlFor={`effective-date-${transaction.id}`}>Effective date:</label>
      <input
        id={`effective-date-${transaction.id}`}
        name="effective_date"
        type="date"
        defaultValue={submittedChanges?.effective_date ?? transaction.effective_date}
        required
        disabled={disabled}
        className="w-full rounded-md border border-gray-300 px-3 py-2"
      />

      {transaction.type === 'buy' && (
        <>
          <label htmlFor={`total-paid-${transaction.id}`}>Total paid:</label>
          <input
            id={`total-paid-${transaction.id}`}
            name="total_paid"
            type="text"
            inputMode="decimal"
            defaultValue={
              (submittedChanges?.total_paid === undefined ? transaction.total_paid : submittedChanges.total_paid) ?? ''
            }
            disabled={disabled}
            className="w-full rounded-md border border-gray-300 px-3 py-2"
          />
          {quantityChange && transaction.total_paid !== null && (
            <p>Check the purchase total. We’ll divide it across the updated quantity.</p>
          )}
        </>
      )}

      <label htmlFor={`quantity-${transaction.id}`}>Quantity:</label>
      <input
        id={`quantity-${transaction.id}`}
        name="quantity"
        type="number"
        defaultValue={initialQuantity}
        min="1"
        max="2147483647"
        step="1"
        required
        disabled={disabled}
        className="w-full rounded-md border border-gray-300 px-3 py-2"
        onChange={(e) => {
          setQuantityChanged(e.currentTarget.valueAsNumber !== transaction.quantity);
        }}
      />

      <div className="flex gap-3">
        <button type="submit" disabled={disabled} className="text-blue-500 hover:cursor-pointer hover:underline">
          {isSaving ? 'Saving...' : 'Save'}
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={onCancel}
          className="text-red-500 hover:cursor-pointer hover:underline"
        >
          Cancel edit
        </button>
      </div>

      {errorMessage !== undefined && (
        <p role="alert" className="text-red-500">
          {errorMessage}
        </p>
      )}
    </form>
  );
};
