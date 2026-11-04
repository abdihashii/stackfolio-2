import type { UseFormReturn } from 'react-hook-form';

import type { BuyFormValues } from '@/types/form.schema';
import type { ItemType } from '@/types/inventory.types';

type UpdateFormProps = {
  updateForm: UseFormReturn<BuyFormValues>;
  id: string;
  isBusy: boolean;
  onUpdate: (id: string, payload: BuyFormValues) => Promise<void>;
  itemTypes: ItemType[];
};

export const UpdateForm = ({ updateForm, id, isBusy, onUpdate, itemTypes }: UpdateFormProps) => {
  return (
    <form noValidate autoComplete="off" onSubmit={updateForm.handleSubmit((data) => onUpdate(id, data))}>
      <div className="flex flex-col gap-1">
        <label htmlFor="update-item-type">Item type:</label>
        <select
          {...updateForm.register('item_type_id', {
            setValueAs: (value) => (value === '' ? null : value),
          })}
          id="update-item-type"
          disabled={updateForm.formState.isSubmitting}
          className="w-full rounded-md border border-gray-300 px-3 py-2"
          aria-invalid={!!updateForm.formState.errors.item_type_id?.message}
          aria-describedby={updateForm.formState.errors.item_type_id?.message ? 'update-item-type-error' : undefined}
        >
          <option value="">None selected</option>
          {itemTypes.map((type) => (
            <option key={type.id} value={type.id}>
              {type.name}
            </option>
          ))}
        </select>
        <p id="update-item-type-error" role="alert" className="text-sm text-red-500">
          {updateForm.formState.errors.item_type_id?.message}
        </p>
      </div>

      <div className="flex flex-col">
        <label htmlFor="update-quantity">Quantity:</label>
        <input
          {...updateForm.register('quantity', { valueAsNumber: true })}
          id="update-quantity"
          type="number"
          min="1"
          step="1"
          disabled={updateForm.formState.isSubmitting}
          className="w-full rounded-md border border-gray-300 px-3 py-2"
          aria-invalid={!!updateForm.formState.errors.quantity}
          aria-describedby={updateForm.formState.errors.quantity ? 'update-quantity-error' : undefined}
        />
        <p id="update-quantity-error" role="alert" className="text-sm text-red-500">
          {updateForm.formState.errors.quantity?.message}
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="update-acquisition-date">Acquisition date (optional):</label>
        <input
          id="update-acquisition-date"
          type="date"
          {...updateForm.register('acquisition_date', { setValueAs: (value) => (value === '' ? null : value) })}
          disabled={updateForm.formState.isSubmitting}
          className="w-full rounded-md border border-gray-300 px-3 py-2"
          aria-invalid={!!updateForm.formState.errors.acquisition_date}
          aria-describedby={updateForm.formState.errors.acquisition_date ? 'update-acquisition-date-error' : undefined}
        />
        <p id="update-acquisition-date-error" role="alert" className="text-sm text-red-500">
          {updateForm.formState.errors.acquisition_date?.message}
        </p>
      </div>

      <button type="submit" className="hover:underline hover:cursor-pointer text-blue-500" disabled={isBusy}>
        update
      </button>
    </form>
  );
};
