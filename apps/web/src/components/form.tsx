import type { SubmitHandler, UseFormReturn } from 'react-hook-form';

import type { CreateHoldingInput } from '@/types/holdings.types';

import { holdingTypes } from '@/types/holdings.types';

import { H2 } from './h2';

type FormProps = {
  form: UseFormReturn<CreateHoldingInput>;
  onSubmit: SubmitHandler<CreateHoldingInput>;
  creatingHoldingError: string;
  isBusy: boolean;
};

export const Form = ({ form, onSubmit, creatingHoldingError, isBusy }: FormProps) => {
  const {
    handleSubmit,
    register,
    resetField,
    watch,
    formState: { errors, isSubmitting },
  } = form;
  const metal = watch('metal');

  return (
    <form
      noValidate
      autoComplete="off"
      aria-disabled={isSubmitting}
      className="flex flex-col gap-4"
      onSubmit={handleSubmit(onSubmit)}
    >
      <H2>Add holding</H2>

      <div className="flex flex-col gap-1">
        <label htmlFor="metal">Metal:</label>
        <select
          {...register('metal', {
            onChange: () => resetField('purity'),
          })}
          id="metal"
          disabled={isSubmitting}
          className="w-full rounded-md border border-gray-300 px-3 py-2"
          aria-invalid={!!errors.metal}
          aria-describedby={errors.metal ? 'metal-error' : undefined}
        >
          <option value="">Choose a metal</option>
          <option value="gold">Gold</option>
          <option value="silver">Silver</option>
        </select>
        <p id="metal-error" role="alert" className="text-sm text-red-500">
          {errors.metal?.message}
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="weight-unit">Weight unit:</label>
        <select
          {...register('weight_unit')}
          id="weight-unit"
          disabled={isSubmitting}
          className="w-full rounded-md border border-gray-300 px-3 py-2"
          aria-invalid={!!errors.weight_unit}
          aria-describedby={errors.weight_unit ? 'weight-unit-error' : undefined}
        >
          <option value="">Choose unit</option>
          <option value="gram">gram</option>
          <option value="ozt">troy ounce</option>
        </select>
        <p id="weight-unit-error" role="alert" className="text-sm text-red-500">
          {errors.weight_unit?.message}
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="weight">Weight per item:</label>
        <input
          {...register('weight', { valueAsNumber: true })}
          id="weight"
          type="number"
          placeholder="Enter weight"
          step="any"
          disabled={isSubmitting}
          className="w-full rounded-md border border-gray-300 px-3 py-2"
          aria-invalid={!!errors.weight}
          aria-describedby={errors.weight ? 'weight-error' : undefined}
        />
        <p id="weight-error" role="alert" className="text-sm text-red-500">
          {errors.weight?.message}
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="purity">Purity:</label>
        <select
          {...register('purity', { valueAsNumber: true })}
          id="purity"
          disabled={!metal || isSubmitting}
          autoComplete="off"
          className="w-full rounded-md border border-gray-300 px-3 py-2"
          aria-invalid={!!errors.purity}
          aria-describedby={errors.purity ? 'purity-error' : undefined}
        >
          <option value="">Choose purity</option>

          {metal === 'gold' ? (
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
        <p id="purity-error" role="alert" className="text-sm text-red-500">
          {errors.purity?.message}
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
        <label htmlFor="holding-type">Holding type (optional):</label>
        <select
          {...register('holding_type', { setValueAs: (value) => (value === '' ? null : value) })}
          id="holding-type"
          disabled={isSubmitting}
          className="w-full rounded-md border border-gray-300 px-3 py-2"
          aria-invalid={!!errors.holding_type}
          aria-describedby={errors.holding_type ? 'holding-type-error' : undefined}
        >
          <option value="">None selected</option>
          {holdingTypes.map((type) => (
            <option key={type} value={type}>
              {type[0].toUpperCase() + type.substring(1)}
            </option>
          ))}
        </select>
        <p id="holding-type-error" role="alert" className="text-sm text-red-500">
          {errors.holding_type?.message}
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
        {creatingHoldingError}
      </p>
    </form>
  );
};
