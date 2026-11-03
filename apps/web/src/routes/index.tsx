import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';

import { Form } from '@/components/form';
import { H2 } from '@/components/h2';
import { ItemCard } from '@/components/item-card';
import { UpdateForm } from '@/components/update-form';
import { useCreateItem } from '@/hooks/use-create-item';
import { useDeleteItem } from '@/hooks/use-delete-item';
import { useUpdateItem } from '@/hooks/use-update-item';
import { fetchInventory, fetchSpotPrices } from '@/lib/apis';
import { calculateStackValue, formatUsd } from '@/lib/utils';

export const Route = createFileRoute('/')({
  component: Home,
});

function Home() {
  const inventoryQuery = useQuery({ queryKey: ['inventory'], queryFn: fetchInventory });
  const spotPricesQuery = useQuery({ queryKey: ['spot-prices'], queryFn: fetchSpotPrices });
  const { form, createItemMutation, onCreateItem } = useCreateItem(inventoryQuery.isPending);
  const { updatingItemId, setUpdatingItemId, updateForm, onUpdateItem, onStartUpdate } = useUpdateItem();
  const isBusyWithoutDelete =
    form.formState.isSubmitting ||
    updateForm.formState.isSubmitting ||
    createItemMutation.isPending ||
    inventoryQuery.isPending;
  const { deleteItemMutation, onDeleteItem } = useDeleteItem(isBusyWithoutDelete);

  const stackValue = calculateStackValue(inventoryQuery.data, {
    gold: spotPricesQuery.data?.prices.gold,
    silver: spotPricesQuery.data?.prices.silver,
  });
  let stackValueText = 'Unavailable';
  if (inventoryQuery.isPending) {
    stackValueText = 'Loading...';
  } else if (!inventoryQuery.isError) {
    if (inventoryQuery.data.length > 0 && spotPricesQuery.isPending) {
      stackValueText = 'Loading...';
    } else if (stackValue !== undefined && (inventoryQuery.data.length === 0 || !spotPricesQuery.isError)) {
      stackValueText = formatUsd(stackValue);
    }
  }
  const isBusy = isBusyWithoutDelete || deleteItemMutation.isPending;

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
        {inventoryQuery.isPending ? (
          <p>loading...</p>
        ) : inventoryQuery.isError ? (
          <p>{inventoryQuery.error.message}</p>
        ) : (
          <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
            {inventoryQuery.data.length > 0 ? (
              inventoryQuery.data.map((item) => {
                const spotPrice = spotPricesQuery.data?.prices[item.metal];

                return (
                  <div key={item.id} className="rounded-md border border-gray-300 p-4">
                    {updatingItemId === item.id ? (
                      <>
                        <UpdateForm
                          updateForm={updateForm}
                          id={item.id}
                          setUpdatingItemId={setUpdatingItemId}
                          isBusy={isBusy}
                          onUpdate={onUpdateItem}
                        />
                      </>
                    ) : (
                      <ItemCard
                        item={item}
                        isBusy={isBusy}
                        isSpotPricesLoading={spotPricesQuery.isPending}
                        spotPricesError={spotPricesQuery.error?.message ?? ''}
                        spotPrice={spotPrice}
                        spotPricesTimestamp={spotPricesQuery.data?.timestamp ?? ''}
                        onDelete={onDeleteItem}
                        onStartUpdate={onStartUpdate}
                      />
                    )}
                  </div>
                );
              })
            ) : (
              <p>No inventory yet. Add your first item below.</p>
            )}
          </div>
        )}

        <Form
          form={form}
          onSubmit={onCreateItem}
          creatingItemError={createItemMutation.error?.message ?? ''}
          isBusy={isBusy}
        />
      </div>
    </main>
  );
}
