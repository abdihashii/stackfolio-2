import type { SubmitHandler, UseFormReturn } from 'react-hook-form';

import type { BuyFormValues } from '@/types/form.schema';
import type { ItemType } from '@/types/inventory.types';

import { H2 } from './h2';

type FormProps = {
  form: UseFormReturn<BuyFormValues>;
  onSubmit: SubmitHandler<BuyFormValues>;
  creatingItemError: string;
  isBusy: boolean;
  itemTypes: ItemType[];
};

export const Form = ({ form, onSubmit, creatingItemError, isBusy, itemTypes }: FormProps) => {
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
        <label htmlFor="acquisition-date">Acquisition date (optional):</label>
        <input
          id="acquisition-date"
          type="date"
          {...register('acquisition_date', { setValueAs: (value) => (value === '' ? null : value) })}
          disabled={isSubmitting}
          className="w-full rounded-md border border-gray-300 px-3 py-2"
          aria-invalid={!!errors.acquisition_date}
          aria-describedby={errors.acquisition_date ? 'acquisition-date-error' : undefined}
        />
        <p id="acquisition-date-error" role="alert" className="text-sm text-red-500">
          {errors.acquisition_date?.message}
        </p>
      </div>

      <button
        type="submit"
        className="rounded-md bg-gray-900 px-4 py-2 font-semibold text-white hover:bg-gray-800 hover:cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
        disabled={isBusy}
      >
        {isSubmitting ? 'Adding...' : 'Add'}
      </button>

      <p role="alert" aria-atomic="true">
        {creatingItemError}
      </p>
    </form>
  );
};
