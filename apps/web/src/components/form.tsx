import type { SubmitHandler, UseFormReturn } from 'react-hook-form';

import type { BuyFormInput, BuyFormValues } from '@/types/form.schema';
import type { ItemType } from '@/types/inventory.types';

import { H2 } from './ui/h2';

type FormProps = {
  form: UseFormReturn<BuyFormInput, undefined, BuyFormValues>;
  onSubmit: SubmitHandler<BuyFormValues>;
  purchasingItemError: string;
  isBusy: boolean;
  itemTypes: ItemType[];
};

export const Form = ({ form, onSubmit, purchasingItemError, isBusy, itemTypes }: FormProps) => {
  const {
    handleSubmit,
    register,
    formState: { errors, isSubmitting },
  } = form;

  return (
    <form
      noValidate
      autoComplete="off"
      aria-disabled={isSubmitting}
      className="flex flex-col gap-4"
      onSubmit={handleSubmit(onSubmit)}
    >
      <H2>Add item</H2>

      <div className="flex flex-col gap-1">
        <label htmlFor="item-type">Item type:</label>
        <select
          {...register('item_type_id', { setValueAs: (value) => (value === '' ? null : value) })}
          id="item-type"
          disabled={isSubmitting}
          className="w-full rounded-md border border-gray-300 px-3 py-2"
          aria-invalid={!!errors.item_type_id}
          aria-describedby={errors.item_type_id ? 'item-type-error' : undefined}
        >
          <option value="">None selected</option>
          {itemTypes?.map((type) => (
            <option key={type.id} value={type.id}>
              {type.name}
            </option>
          ))}
        </select>
        <p id="item-type-error" role="alert" className="text-sm text-red-500">
          {errors.item_type_id?.message}
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="quantity">Quantity:</label>
        <input
          {...register('quantity', { valueAsNumber: true })}
          id="quantity"
          type="number"
          min="1"
          step="1"
          disabled={isSubmitting}
          className="w-full rounded-md border border-gray-300 px-3 py-2"
          aria-invalid={!!errors.quantity}
          aria-describedby={errors.quantity ? 'quantity-error' : undefined}
        />
        <p id="quantity-error" role="alert" className="text-sm text-red-500">
          {errors.quantity?.message}
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="total-paid">Total paid (USD, optional):</label>
        <input
          id="total-paid"
          type="text"
          {...register('total_paid')}
          disabled={isSubmitting}
          className="w-full rounded-md border border-gray-300 px-3 py-2"
          aria-invalid={!!errors.total_paid}
          aria-describedby={errors.total_paid ? 'total-paid-hint total-paid-error' : 'total-paid-hint'}
        />
        <p id="total-paid-hint" className="text-sm text-gray-600">
          Enter the total for this purchase. Leave blank if the amount is unknown. Enter 0 if you paid nothing.
        </p>
        <p id="total-paid-error" role="alert" className="text-sm text-red-500">
          {errors.total_paid?.message}
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="acquisition-date">Acquisition date (optional):</label>
        <input
          id="acquisition-date"
          type="date"
          {...register('acquisition_date', { setValueAs: (value) => (value === '' ? null : value) })}
          disabled={isSubmitting}
          className="w-full rounded-md border border-gray-300 px-3 py-2"
          aria-invalid={!!errors.acquisition_date}
          aria-describedby={
            errors.acquisition_date ? 'acquisition-date-hint acquisition-date-error' : 'acquisition-date-hint'
          }
          max={new Date().toISOString().slice(0, 10)}
        />
        <p id="acquisition-date-hint" className="text-sm text-gray-600">
          Leave blank to use today's UTC date.
        </p>
        <p id="acquisition-date-error" role="alert" className="text-sm text-red-500">
          {errors.acquisition_date?.message}
        </p>
      </div>

      <button
        type="submit"
        className="rounded-md bg-gray-900 px-4 py-2 font-semibold text-white hover:cursor-pointer hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={isBusy}
      >
        {isSubmitting ? 'Adding...' : 'Add'}
      </button>

      <p role="alert" aria-atomic="true">
        {purchasingItemError}
      </p>
    </form>
  );
};
