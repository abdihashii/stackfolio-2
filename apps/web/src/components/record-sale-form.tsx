import type { SubmitEventHandler } from 'react';

import type { recordSale } from '@/lib/apis';
import type { Transaction } from '@/types/inventory.types';

type RecordSaleFormProps = {
  transaction: Transaction;
  disabled: boolean;
  isSaving: boolean;
  errorMessage?: string;
  onSave: (payload: Omit<Parameters<typeof recordSale>[1], 'buy_id'>) => void;
  onCancel: () => void;
};

export const RecordSaleForm = ({
  transaction,
  disabled,
  isSaving,
  errorMessage,
  onSave,
  onCancel,
}: RecordSaleFormProps) => {
  const handleSubmit: SubmitEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();
    if (disabled) return;
    const data = new FormData(event.currentTarget);
    onSave({
      quantity: Number(data.get('quantity')),
      sale_date: String(data.get('sale_date')),
    });
  };

  return (
    <form className="flex flex-col gap-2" onSubmit={handleSubmit}>
      <p>Sell from buy on {transaction.effective_date}</p>
      <p>Available: {transaction.remaining_quantity}</p>
      <label htmlFor={`sale-quantity-${transaction.id}`}>Quantity to sell:</label>
      <input
        id={`sale-quantity-${transaction.id}`}
        name="quantity"
        type="number"
        defaultValue={1}
        min="1"
        max={transaction.remaining_quantity}
        step="1"
        required
        disabled={disabled}
        className="w-full rounded-md border border-gray-300 px-3 py-2"
      />
      <label htmlFor={`sale-date-${transaction.id}`}>Sale date:</label>
      <input
        id={`sale-date-${transaction.id}`}
        name="sale_date"
        type="date"
        defaultValue={new Date().toISOString().slice(0, 10)}
        min={transaction.effective_date}
        max={new Date().toISOString().slice(0, 10)}
        required
        disabled={disabled}
        className="w-full rounded-md border border-gray-300 px-3 py-2"
      />
      <button type="submit" disabled={disabled} className="text-blue-500 hover:cursor-pointer hover:underline">
        {isSaving ? 'Saving...' : 'Save sale'}
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={onCancel}
        className="text-red-500 hover:cursor-pointer hover:underline"
      >
        Cancel sale
      </button>
      {errorMessage !== undefined && (
        <p role="alert" className="text-red-500">
          {errorMessage}
        </p>
      )}
    </form>
  );
};
