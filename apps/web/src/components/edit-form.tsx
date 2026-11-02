import type { UseFormReturn } from 'react-hook-form';

import type { CreateHoldingInput } from '@/types/holdings.types';

import { holdingTypes } from '@/types/holdings.types';

type EditFormProps = {
  editForm: UseFormReturn<CreateHoldingInput>;
  id: string;
  setEditingHoldingId: React.Dispatch<React.SetStateAction<string | null>>;
  isBusy: boolean;
  onEdit: (id: string, payload: CreateHoldingInput) => Promise<void>;
};

export const EditForm = ({ editForm, id, setEditingHoldingId, isBusy, onEdit }: EditFormProps) => {
  const { watch } = editForm;
  const editingMetal = watch('metal');

  return (
    <form noValidate autoComplete="off" onSubmit={editForm.handleSubmit((data) => onEdit(id, data))}>
      <div className="flex flex-col">
        <label htmlFor="edit-metal">Metal:</label>
        <select
          {...editForm.register('metal', {
            onChange: () => editForm.setValue('purity', NaN, { shouldDirty: true }),
          })}
          id="edit-metal"
          disabled={editForm.formState.isSubmitting}
          className="w-full rounded-md border border-gray-300 px-3 py-2"
          aria-invalid={!!editForm.formState.errors.metal}
          aria-describedby={editForm.formState.errors.metal ? 'edit-metal-error' : undefined}
        >
          <option value="">Choose a metal</option>
          <option value="gold">Gold</option>
          <option value="silver">Silver</option>
        </select>
        <p id="edit-metal-error" role="alert" className="text-sm text-red-500">
          {editForm.formState.errors.metal?.message}
        </p>
      </div>

      <div className="flex flex-col">
        <label htmlFor="edit-weight-unit">Weight unit:</label>
        <select
          {...editForm.register('weight_unit')}
          id="edit-weight-unit"
          disabled={editForm.formState.isSubmitting}
          className="w-full rounded-md border border-gray-300 px-3 py-2"
          aria-invalid={!!editForm.formState.errors.weight_unit}
          aria-describedby={editForm.formState.errors.weight_unit ? 'edit-weight-unit-error' : undefined}
        >
          <option value="">Choose unit</option>
          <option value="gram">gram</option>
          <option value="ozt">troy ounce</option>
        </select>
        <p id="edit-weight-unit-error" role="alert" className="text-sm text-red-500">
          {editForm.formState.errors.weight_unit?.message}
        </p>
      </div>

      <div className="flex flex-col">
        <label htmlFor="edit-weight">Weight per item:</label>
        <input
          {...editForm.register('weight', { valueAsNumber: true })}
          id="edit-weight"
          type="number"
          step="any"
          disabled={editForm.formState.isSubmitting}
          className="w-full rounded-md border border-gray-300 px-3 py-2"
          aria-invalid={!!editForm.formState.errors.weight}
          aria-describedby={editForm.formState.errors.weight ? 'edit-weight-error' : undefined}
        />
        <p id="edit-weight-error" role="alert" className="text-sm text-red-500">
          {editForm.formState.errors.weight?.message}
        </p>
      </div>

      <div className="flex flex-col">
        <label htmlFor="edit-purity">Purity:</label>
        <select
          {...editForm.register('purity', { valueAsNumber: true })}
          id="edit-purity"
          disabled={!editingMetal || editForm.formState.isSubmitting}
          autoComplete="off"
          className="w-full rounded-md border border-gray-300 px-3 py-2"
          aria-invalid={!!editForm.formState.errors.purity}
          aria-describedby={editForm.formState.errors.purity ? 'edit-purity-error' : undefined}
        >
          <option value="">Choose purity</option>

          {editingMetal === 'gold' ? (
            <>
              <option value={9 / 24}>9K</option>
              <option value={14 / 24}>14K</option>
              <option value={18 / 24}>18K</option>
              <option value={24 / 24}>24K (100%, nominal)</option>
              <option value={0.999}>Fine gold (.999)</option>
              <option value={0.9999}>Fine gold (.9999)</option>
            </>
          ) : (
            <>
              <option value="0.925">Sterling silver (.925)</option>
              <option value="0.999">Fine silver (.999)</option>
              <option value="0.9999">Fine silver (.9999)</option>
            </>
          )}
        </select>
        <p id="edit-purity-error" role="alert" className="text-sm text-red-500">
          {editForm.formState.errors.purity?.message}
        </p>
      </div>

      <div className="flex flex-col">
        <label htmlFor="edit-quantity">Quantity:</label>
        <input
          {...editForm.register('quantity', { valueAsNumber: true })}
          id="edit-quantity"
          type="number"
          min="1"
          step="1"
          disabled={editForm.formState.isSubmitting}
          className="w-full rounded-md border border-gray-300 px-3 py-2"
          aria-invalid={!!editForm.formState.errors.quantity}
          aria-describedby={editForm.formState.errors.quantity ? 'edit-quantity-error' : undefined}
        />
        <p id="edit-quantity-error" role="alert" className="text-sm text-red-500">
          {editForm.formState.errors.quantity?.message}
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="edit-holding-type">Holding type:</label>
        <select
          {...editForm.register('holding_type', {
            setValueAs: (value) => (value === '' ? null : value),
          })}
          id="edit-holding-type"
          disabled={editForm.formState.isSubmitting}
          className="w-full rounded-md border border-gray-300 px-3 py-2"
          aria-invalid={!!editForm.formState.errors.holding_type}
          aria-describedby={editForm.formState.errors.holding_type ? 'edit-holding-type-error' : undefined}
        >
          <option value="">None selected</option>
          {holdingTypes.map((type) => (
            <option key={type} value={type}>
              {type[0].toUpperCase() + type.substring(1)}
            </option>
          ))}
        </select>
        <p id="edit-holding-type-error" role="alert" className="text-sm text-red-500">
          {editForm.formState.errors.holding_type?.message}
        </p>
      </div>

      <div className="flex justify-between">
        <button
          type="button"
          onClick={() => setEditingHoldingId(null)}
          className="hover:underline hover:cursor-pointer text-red-500"
          disabled={isBusy}
        >
          cancel
        </button>
        <button type="submit" className="hover:underline hover:cursor-pointer text-blue-500" disabled={isBusy}>
          update
        </button>
      </div>
    </form>
  );
};
