import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';

import type { Holding } from '@/types/holdings.types';

import { Form } from '@/components/form';
import { H2 } from '@/components/h2';
import { HoldingCard } from '@/components/holding-card';
import { UpdateForm } from '@/components/update-form';
import { useCreateHolding } from '@/hooks/use-create-holding';
import { useDeleteHolding } from '@/hooks/use-delete-holding';
import { useUpdateHolding } from '@/hooks/use-update-holding';
import { fetchAllHoldings, fetchSpotPrices } from '@/lib/apis';
import { calculateStackValue, formatUsd } from '@/lib/utils';

export const Route = createFileRoute('/')({
  component: Home,
});

function Home() {
  const holdingsQuery = useQuery({ queryKey: ['holdings'], queryFn: fetchAllHoldings });
  const spotPricesQuery = useQuery({ queryKey: ['spot-prices'], queryFn: fetchSpotPrices });
  const { form, createHoldingMutation, onCreateHolding } = useCreateHolding(holdingsQuery.isPending);
  const { updatingHoldingId, setUpdatingHoldingId, updateForm, onUpdateHolding, onStartUpdate } = useUpdateHolding();
  const { deleteHoldingMutation, onDeleteHolding } = useDeleteHolding(
    form.formState.isSubmitting ||
      updateForm.formState.isSubmitting ||
      createHoldingMutation.isPending ||
      holdingsQuery.isPending,
  );

  const stackValue = calculateStackValue(holdingsQuery.data, {
    gold: spotPricesQuery.data?.prices.gold,
    silver: spotPricesQuery.data?.prices.silver,
  });
  let stackValueText = 'Unavailable';
  if (holdingsQuery.isPending) {
    stackValueText = 'Loading...';
  } else if (!holdingsQuery.isError) {
    if (holdingsQuery.data.length > 0 && spotPricesQuery.isPending) {
      stackValueText = 'Loading...';
    } else if (stackValue !== undefined && (holdingsQuery.data.length === 0 || !spotPricesQuery.isError)) {
      stackValueText = formatUsd(stackValue);
    }
  }
  const isBusy =
    form.formState.isSubmitting ||
    updateForm.formState.isSubmitting ||
    createHoldingMutation.isPending ||
    deleteHoldingMutation.isPending ||
    holdingsQuery.isPending;

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
                const spotPrice = spotPricesQuery.data?.prices[holding.metal];

                return (
                  <div key={holding.id} className="rounded-md border border-gray-300 p-4">
                    {updatingHoldingId === holding.id ? (
                      <>
                        <UpdateForm
                          updateForm={updateForm}
                          id={holding.id}
                          setUpdateingHoldingId={setUpdatingHoldingId}
                          isBusy={isBusy}
                          onUpdate={onUpdateHolding}
                        />
                      </>
                    ) : (
                      <HoldingCard
                        holding={holding}
                        isBusy={isBusy}
                        isSpotPricesLoading={spotPricesQuery.isPending}
                        spotPricesError={spotPricesQuery.error?.message ?? ''}
                        spotPrice={spotPrice}
                        spotPricesTimestamp={spotPricesQuery.data?.timestamp ?? ''}
                        onDelete={onDeleteHolding}
                        onStartUpdate={onStartUpdate}
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

        <Form
          form={form}
          onSubmit={onCreateHolding}
          creatingHoldingError={createHoldingMutation.error?.message ?? ''}
          isBusy={isBusy}
        />
      </div>
    </main>
  );
}
