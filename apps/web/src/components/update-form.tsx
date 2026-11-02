import type { UseFormReturn } from 'react-hook-form';

import type { CreateHoldingInput } from '@/types/holdings.types';

import { holdingTypes } from '@/types/holdings.types';

type UpdateFormProps = {
  updateForm: UseFormReturn<CreateHoldingInput>;
  id: string;
  setUpdateingHoldingId: React.Dispatch<React.SetStateAction<string | null>>;
  isBusy: boolean;
  onUpdate: (id: string, payload: CreateHoldingInput) => Promise<void>;
};

export const UpdateForm = ({ updateForm, id, setUpdateingHoldingId, isBusy, onUpdate }: UpdateFormProps) => {
  const { watch } = updateForm;
  const updateingMetal = watch('metal');

  return (
    <form noValidate autoComplete="off" onSubmit={updateForm.handleSubmit((data) => onUpdate(id, data))}>
      <div className="flex flex-col">
        <label htmlFor="update-metal">Metal:</label>
        <select
          {...updateForm.register('metal', {
            onChange: () => updateForm.setValue('purity', NaN, { shouldDirty: true }),
          })}
          id="update-metal"
          disabled={updateForm.formState.isSubmitting}
          className="w-full rounded-md border border-gray-300 px-3 py-2"
          aria-invalid={!!updateForm.formState.errors.metal}
          aria-describedby={updateForm.formState.errors.metal ? 'update-metal-error' : undefined}
        >
          <option value="">Choose a metal</option>
          <option value="gold">Gold</option>
          <option value="silver">Silver</option>
        </select>
        <p id="update-metal-error" role="alert" className="text-sm text-red-500">
          {updateForm.formState.errors.metal?.message}
        </p>
      </div>

      <div className="flex flex-col">
        <label htmlFor="update-weight-unit">Weight unit:</label>
        <select
          {...updateForm.register('weight_unit')}
          id="update-weight-unit"
          disabled={updateForm.formState.isSubmitting}
          className="w-full rounded-md border border-gray-300 px-3 py-2"
          aria-invalid={!!updateForm.formState.errors.weight_unit}
          aria-describedby={updateForm.formState.errors.weight_unit ? 'update-weight-unit-error' : undefined}
        >
          <option value="">Choose unit</option>
          <option value="gram">gram</option>
          <option value="ozt">troy ounce</option>
        </select>
        <p id="update-weight-unit-error" role="alert" className="text-sm text-red-500">
          {updateForm.formState.errors.weight_unit?.message}
        </p>
      </div>

      <div className="flex flex-col">
        <label htmlFor="update-weight">Weight per item:</label>
        <input
          {...updateForm.register('weight', { valueAsNumber: true })}
          id="update-weight"
          type="number"
          step="any"
          disabled={updateForm.formState.isSubmitting}
          className="w-full rounded-md border border-gray-300 px-3 py-2"
          aria-invalid={!!updateForm.formState.errors.weight}
          aria-describedby={updateForm.formState.errors.weight ? 'update-weight-error' : undefined}
        />
        <p id="update-weight-error" role="alert" className="text-sm text-red-500">
          {updateForm.formState.errors.weight?.message}
        </p>
      </div>

      <div className="flex flex-col">
        <label htmlFor="update-purity">Purity:</label>
        <select
          {...updateForm.register('purity', { valueAsNumber: true })}
          id="update-purity"
          disabled={!updateingMetal || updateForm.formState.isSubmitting}
          autoComplete="off"
          className="w-full rounded-md border border-gray-300 px-3 py-2"
          aria-invalid={!!updateForm.formState.errors.purity}
          aria-describedby={updateForm.formState.errors.purity ? 'update-purity-error' : undefined}
        >
          <option value="">Choose purity</option>

          {updateingMetal === 'gold' ? (
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
        <p id="update-purity-error" role="alert" className="text-sm text-red-500">
          {updateForm.formState.errors.purity?.message}
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
        <label htmlFor="update-holding-type">Holding type:</label>
        <select
          {...updateForm.register('holding_type', {
            setValueAs: (value) => (value === '' ? null : value),
          })}
          id="update-holding-type"
          disabled={updateForm.formState.isSubmitting}
          className="w-full rounded-md border border-gray-300 px-3 py-2"
          aria-invalid={!!updateForm.formState.errors.holding_type}
          aria-describedby={updateForm.formState.errors.holding_type ? 'update-holding-type-error' : undefined}
        >
          <option value="">None selected</option>
          {holdingTypes.map((type) => (
            <option key={type} value={type}>
              {type[0].toUpperCase() + type.substring(1)}
            </option>
          ))}
        </select>
        <p id="update-holding-type-error" role="alert" className="text-sm text-red-500">
          {updateForm.formState.errors.holding_type?.message}
        </p>
      </div>

      <div className="flex justify-between">
        <button
          type="button"
          onClick={() => setUpdateingHoldingId(null)}
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
