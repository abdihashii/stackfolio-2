import { zodResolver } from '@hookform/resolvers/zod';
import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { type SubmitHandler, useForm } from 'react-hook-form';
import * as z from 'zod';

import { calculateStackValue, formatUsd, calculateHoldingValue } from '../lib/utils';
import type { Holding, CreateHoldingInput } from '../types/holdings.types';
import { metals, weightUnits, holdingTypes } from '../types/holdings.types';

const schema = z.object({
  metal: z.enum(metals),
  weight_unit: z.enum(weightUnits),
  weight: z.number().positive(),
  purity: z.number().positive().max(1),
  quantity: z.number().int().positive(),
  holding_type: z.enum(holdingTypes).nullable(),
});

type FormValues = z.infer<typeof schema>;

// TODO: move to lib
const backendUrlPath = import.meta.env.VITE_API_URL;

// TODO: move to lib
const fetchSpotPrices = async () => {
  const res = await fetch(`${backendUrlPath}/spot-prices`);
  if (!res.ok) {
    throw new Error(`Could not fetch spot prices.`);
  }
  const data = (await res.json()) as { timestamp: string; prices: { gold: number; silver: number } };
  return data;
};

// TODO: move to a custom hook and API lib files
const fetchAllHoldings = async (): Promise<Holding[]> => {
  // TODO: show user-facing API validation messages on submit; keep unexpected errors generic.
  const res = await fetch(`${backendUrlPath}/holdings`, { headers: { 'Content-Type': 'application/json' } });
  const data = await res.json();
  if (!res.ok) {
    const message = Array.isArray(data.message) ? data.message.join(', ') : data.message;
    throw Error(typeof message === 'string' && message.trim() ? message : 'Could not load holdings.');
  }
  return data;
};

// TODO: move to a custom hook and API lib files
const createHolding = async (payload: CreateHoldingInput): Promise<Holding> => {
  // TODO: show user-facing API validation messages on submit; keep unexpected errors generic.
  const res = await fetch(`${backendUrlPath}/holdings`, {
    method: 'POST',
    headers: {
      'Content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    const message = Array.isArray(data.message) ? data.message.join(', ') : data.message;
    throw new Error(typeof message === 'string' && message.trim() ? message : 'Could not create holding.');
  }
  return data;
};

export const Route = createFileRoute('/')({
  component: Home,
});

function Home() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [isHoldingsLoading, setIsHoldingsLoading] = useState<boolean>(true);
  const [holdingsError, setHoldingsError] = useState<string>('');
  const [creatingHoldingError, setCreatingHoldingError] = useState<string>('');
  const [goldSpotPrice, setGoldSpotPrice] = useState<number | undefined>(undefined);
  const [silverSpotPrice, setSilverSpotPrice] = useState<number | undefined>(undefined);
  const [isSpotPricesLoading, setIsSpotPricesLoading] = useState<boolean>(true);
  const [spotPricesError, setSpotPricesError] = useState<string>('');
  const [spotPricesTimestamp, setSpotPricesTimestamp] = useState<string>(''); // TODO: simply spot price state

  const {
    register,
    handleSubmit,
    resetField,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { quantity: 1 } });

  const metal = watch('metal');

  // TODo: move to custom hook file
  useEffect(() => {
    async function getAllHoldings() {
      try {
        setIsHoldingsLoading(true);
        const fetchedHoldings = await fetchAllHoldings();
        setHoldings(fetchedHoldings);
      } catch {
        setHoldingsError("Couldn't load your holdings. Reload the page and try again.");
      } finally {
        setIsHoldingsLoading(false);
      }
    }

    async function getSpotPrices() {
      try {
        setIsSpotPricesLoading(true);
        const fetchedSpotPrices = await fetchSpotPrices();
        setGoldSpotPrice(fetchedSpotPrices.prices.gold);
        setSilverSpotPrice(fetchedSpotPrices.prices.silver);
        setSpotPricesTimestamp(fetchedSpotPrices.timestamp);
      } catch {
        setSpotPricesError('Could not load spot prices. Reload the page and try again.');
      } finally {
        setIsSpotPricesLoading(false);
      }
    }

    getAllHoldings();
    getSpotPrices();

    // TODO: add effect cleanup to ignore results after unmount.
  }, []);

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    try {
      setCreatingHoldingError('');
      const savedHolding = await createHolding(data);
      setHoldings((currentHoldings) => [...currentHoldings, savedHolding]);
    } catch {
      setCreatingHoldingError('Could not create holding. Please try again');
    }
  };

  const stackValue = calculateStackValue(holdings, {
    gold: goldSpotPrice,
    silver: silverSpotPrice,
  });
  let stackValueText = 'Unavailable';
  if (isHoldingsLoading) {
    stackValueText = 'Loading...';
  } else if (!holdingsError) {
    if (holdings.length > 0 && isSpotPricesLoading) {
      stackValueText = 'Loading...';
    } else if (stackValue !== undefined && (holdings.length === 0 || !spotPricesError)) {
      stackValueText = formatUsd(stackValue);
    }
  }

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8">
      <h1 className="font-bold text-4xl">StackFolio 2</h1>

      <div className="flex w-full max-w-md flex-col gap-1 rounded-md border border-gray-300 p-4">
        <h2 className="font-bold text-2xl">Total Stack Value: {stackValueText}</h2>
        <p className="text-gray-500">
          Based on weight, purity, quantity, and spot price. Actual resale value may differ.
        </p>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        {isHoldingsLoading ? (
          <p>loading...</p>
        ) : holdingsError ? (
          <p>{holdingsError}</p>
        ) : (
          <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
            {holdings.length > 0 ? (
              holdings.map((holding) => {
                const { id, metal, weight_unit, weight, purity, quantity, holding_type } = holding;
                const spotPrice = metal === 'gold' ? goldSpotPrice : silverSpotPrice;

                return (
                  <div key={id} className="rounded-md border border-gray-300 p-4">
                    <h2 className="text-lg font-semibold capitalize">{metal}</h2>
                    <p>
                      Weight: {weight} {weight_unit}
                    </p>
                    <p>Purity: {purity}</p>
                    <p>Quantity: {quantity}</p>
                    <p>
                      Total weight: {weight * quantity} {weight_unit}
                    </p>
                    {holding_type && <p>{holding_type}</p>}
                    {isSpotPricesLoading ? (
                      <p>Holding value: loading...</p>
                    ) : spotPricesError ? (
                      <p>{spotPricesError}</p>
                    ) : spotPrice !== undefined ? (
                      <>
                        <p className="mt-2 text-sm text-gray-500 wrap-break-word">
                          Price snapshot: {new Date(spotPricesTimestamp).toISOString()}
                        </p>

                        <p className="mt-3 font-semibold">
                          Holding value: {formatUsd(calculateHoldingValue(holding, spotPrice))}
                        </p>
                      </>
                    ) : (
                      <p className="mt-3 font-semibold">Holding value: Unavailable</p>
                    )}
                  </div>
                );
              })
            ) : (
              <p>No holdings yet. Add your first holding below.</p>
            )}
          </div>
        )}

        {/* TODO: move to its own component */}
        <form aria-disabled={isSubmitting} className="flex flex-col gap-4 text-xl" onSubmit={handleSubmit(onSubmit)}>
          <h2 className="font-bold text-xl">Add holding</h2>

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
            <label htmlFor="holding-type">Holding type:</label>
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

          <button
            type="submit"
            className="rounded-md bg-gray-900 px-4 py-2 font-semibold text-white hover:bg-gray-800 hover:cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Adding...' : 'Add'}
          </button>

          <p role="alert" aria-atomic="true">
            {creatingHoldingError}
          </p>
        </form>
      </div>
    </main>
  );
}
