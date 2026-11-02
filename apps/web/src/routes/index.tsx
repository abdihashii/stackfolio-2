import type { SubmitHandler } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

import type { FormValues } from '@/types/form.schema';
import type { CreateHoldingInput, Holding } from '@/types/holdings.types';

import { EditForm } from '@/components/edit-form';
import { Form } from '@/components/form';
import { H2 } from '@/components/h2';
import { HoldingCard } from '@/components/holding-card';
import { fetchAllHoldings, fetchSpotPrices, createHolding, deleteHolding, updateHolding } from '@/lib/apis';
import { calculateStackValue, formatUsd } from '@/lib/utils';
import { schema } from '@/types/form.schema';

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

  const holdingsQuery = useQuery({ queryKey: ['holdings'], queryFn: fetchAllHoldings });

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

  const onDeleteHolding = async (id: string) => {
    try {
      setIsMutating(true);
      await deleteHolding(id);
      setHoldings((currentHoldings) => currentHoldings.filter((holding) => holding.id !== id));
    } catch (error) {
      alert(error);
    } finally {
      setIsMutating(false);
    }
  };

  const onEditHolding = async (id: string, data: CreateHoldingInput) => {
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
  };

  const onStartEdit = (holding: Holding) => {
    const { id, metal, weight_unit, weight, purity, quantity, holding_type } = holding;
    editForm.reset({
      metal,
      weight_unit,
      weight,
      purity,
      quantity,
      holding_type,
    });
    setEditingHoldingId(id);
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
        <H2>Total Stack Value: {stackValueText}</H2>
        <p className="text-gray-500">
          Based on weight, purity, quantity, and spot price. Actual resale value may differ.
        </p>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        {holdingsQuery.isPending ? (
          <p>loading...</p>
        ) : holdingsQuery.isError ? (
          <p>{holdingsQuery.error.message}</p>
        ) : (
          <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
            {holdingsQuery.data.length > 0 ? (
              holdingsQuery.data.map((holding) => {
                const spotPrice = holding.metal === 'gold' ? goldSpotPrice : silverSpotPrice;

                return (
                  <div key={holding.id} className="rounded-md border border-gray-300 p-4">
                    {editingHoldingId === holding.id ? (
                      <>
                        <EditForm
                          editForm={editForm}
                          id={holding.id}
                          setEditingHoldingId={setEditingHoldingId}
                          isBusy={isBusy}
                          onEdit={onEditHolding}
                        />
                      </>
                    ) : (
                      <HoldingCard
                        holding={holding}
                        isBusy={isBusy}
                        isSpotPricesLoading={isSpotPricesLoading}
                        spotPricesError={spotPricesError}
                        spotPrice={spotPrice}
                        spotPricesTimestamp={spotPricesTimestamp}
                        onDelete={onDeleteHolding}
                        onStartEdit={onStartEdit}
                      />
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
