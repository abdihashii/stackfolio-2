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
import type { CreateHoldingInput, Holding } from '../types/holdings.types';

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

  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { quantity: 1 } });

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

                    <div className="w-full flex justify-between">
                      <button
                        className="text-blue-500 hover:cursor-pointer hover:underline"
                        type="button"
                        onClick={async () => {
                          setIsMutating(true);
                          try {
                            try {
                              const newPayload: CreateHoldingInput = {
                                metal: 'gold',
                                weight_unit,
                                weight,
                                purity,
                                quantity,
                                holding_type,
                              };
                              await updateHolding(id, newPayload);
                            } catch (error) {
                              alert(error);
                              return;
                            }

                            try {
                              setHoldings(await fetchAllHoldings());
                            } catch {
                              alert('Holding saved, but could not refresh. Reload the page.');
                            }
                          } finally {
                            setIsMutating(false);
                          }
                        }}
                        disabled={isMutating}
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
                            setHoldings((currentHoldings) => currentHoldings.filter((holding) => holding.id !== id));
                          } catch (error) {
                            alert(error);
                          } finally {
                            setIsMutating(false);
                          }
                        }}
                        disabled={isMutating}
                      >
                        delete
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <p>No holdings yet. Add your first holding below.</p>
            )}
          </div>
        )}

        <Form form={form} onSubmit={onSubmit} creatingHoldingError={creatingHoldingError} />
      </div>
    </main>
  );
}
