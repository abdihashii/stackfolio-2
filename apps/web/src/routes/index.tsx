import { zodResolver } from '@hookform/resolvers/zod';
import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import type { SubmitHandler } from 'react-hook-form';
import { useForm } from 'react-hook-form';

import { Form } from '../components/form';
import { fetchAllHoldings, fetchSpotPrices, createHolding, deleteHolding, updateHolding } from '../lib/apis';
import { calculateStackValue, formatUsd, calculateHoldingValue } from '../lib/utils';
import type { FormValues } from '../types/form.schema';
import { schema } from '../types/form.schema';
import type { Holding } from '../types/holdings.types';
import { holdingTypes } from '../types/holdings.types';

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
  const [spotPricesTimestamp, setSpotPricesTimestamp] = useState<string>(''); // TODO: simply spot price state

  const [isSpotPricesLoading, setIsSpotPricesLoading] = useState<boolean>(true);
  const [spotPricesError, setSpotPricesError] = useState<string>('');

  const [isMutating, setIsMutating] = useState<boolean>(false);

  const [editingHoldingId, setEditingHoldingId] = useState<string | null>(null);

  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { quantity: 1 } });
  const editForm = useForm<FormValues>({ resolver: zodResolver(schema) });
  const editingMetal = editForm.watch('metal');

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
    if (isMutating) return;
    try {
      setCreatingHoldingError('');
      const savedHolding = await createHolding(data);
      setHoldings((currentHoldings) => [...currentHoldings, savedHolding]);
      form.reset();
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
  const isBusy = form.formState.isSubmitting || editForm.formState.isSubmitting || isMutating;

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
                    {editingHoldingId === id ? (
                      <>
                        {/* Move this to its own component */}
                        <form
                          noValidate
                          autoComplete="off"
                          onSubmit={editForm.handleSubmit(async (data) => {
                            try {
                              await updateHolding(id, data);
                              setEditingHoldingId(null);
                            } catch (error) {
                              alert(error instanceof Error ? error.message : 'Could not update holding.');
                              return;
                            }

                            try {
                              setHoldings(await fetchAllHoldings());
                            } catch {
                              alert('Holding saved, but could not refresh. Reload the page.');
                            }
                          })}
                        >
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
                              aria-describedby={
                                editForm.formState.errors.weight_unit ? 'edit-weight-unit-error' : undefined
                              }
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
                            <button
                              type="submit"
                              className="hover:underline hover:cursor-pointer text-blue-500"
                              disabled={isBusy}
                            >
                              update
                            </button>
                          </div>
                        </form>
                      </>
                    ) : (
                      <>
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

                        <div className="w-full flex justify-between">
                          <button
                            className="text-blue-500 hover:cursor-pointer hover:underline"
                            type="button"
                            onClick={() => {
                              editForm.reset({
                                metal,
                                weight_unit,
                                weight,
                                purity,
                                quantity,
                                holding_type,
                              });
                              setEditingHoldingId(id);
                            }}
                            disabled={isBusy}
                          >
                            edit
                          </button>
                          <button
                            className="text-red-500 hover:cursor-pointer hover:underline"
                            type="button"
                            onClick={async () => {
                              try {
                                setIsMutating(true);
                                await deleteHolding(id);
                                setHoldings((currentHoldings) =>
                                  currentHoldings.filter((holding) => holding.id !== id),
                                );
                              } catch (error) {
                                alert(error);
                              } finally {
                                setIsMutating(false);
                              }
                            }}
                            disabled={isBusy}
                          >
                            delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })
            ) : (
              <p>No holdings yet. Add your first holding below.</p>
            )}
          </div>
        )}

        <Form form={form} onSubmit={onSubmit} creatingHoldingError={creatingHoldingError} isBusy={isBusy} />
      </div>
    </main>
  );
}
