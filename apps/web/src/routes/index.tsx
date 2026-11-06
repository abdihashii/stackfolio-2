import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';

import { Form } from '@/components/form';
import { H2 } from '@/components/h2';
import { ItemCard } from '@/components/item-card';
import { useCreateItem } from '@/hooks/use-create-item';
import { useDeleteItem } from '@/hooks/use-delete-item';
import { fetchInventory, fetchItemTypes, fetchValuation } from '@/lib/apis';
import { formatUsd } from '@/lib/utils';

export const Route = createFileRoute('/')({
  component: Home,
});

function Home() {
  const [page, setPage] = useState(1);

  const inventoryQuery = useQuery({ queryKey: ['inventory', page], queryFn: () => fetchInventory(page) });
  const itemTypesQuery = useQuery({ queryKey: ['itemTypes'], queryFn: fetchItemTypes });
  const valuationQuery = useQuery({
    queryKey: ['valuation'],
    queryFn: () => fetchValuation(),
  });

  const { form, createItemMutation, onCreateItem } = useCreateItem(inventoryQuery.isPending);
  const isBusyWithoutDelete = form.formState.isSubmitting || createItemMutation.isPending || inventoryQuery.isPending;
  const { deleteItemMutation, onDeleteItem } = useDeleteItem(isBusyWithoutDelete);

  const isBusy = isBusyWithoutDelete || deleteItemMutation.isPending;

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8">
      <h1 className="text-4xl font-bold">StackFolio 2</h1>

      <div className="flex w-full max-w-md flex-col gap-1 rounded-md border border-gray-300 p-4">
        <H2>
          Total Stack Value:{' '}
          {valuationQuery.isPending
            ? 'loading...'
            : valuationQuery.isError
              ? valuationQuery.error.message
              : formatUsd(valuationQuery.data.totalValue)}
        </H2>
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
            {inventoryQuery.data?.inventory.length > 0 ? (
              inventoryQuery.data.inventory.map((item) => {
                const spotPrice = valuationQuery?.data?.quote.prices[item.item_type.metal];

                return (
                  <div key={item.id} className="rounded-md border border-gray-300 p-4">
                    <ItemCard
                      item={item}
                      isBusy={isBusy}
                      isSpotPricesLoading={valuationQuery.isPending}
                      spotPricesError={valuationQuery.error?.message ?? ''}
                      spotPrice={spotPrice}
                      spotPricesTimestamp={valuationQuery.data?.quote.timestamp ?? ''}
                      onDelete={onDeleteItem}
                    />
                  </div>
                );
              })
            ) : (
              <p>No inventory yet. Add your first item below.</p>
            )}
          </div>
        )}

        {itemTypesQuery.isPending ? (
          <p>Loading item types...</p>
        ) : itemTypesQuery.isError ? (
          <p>{itemTypesQuery.error.message}</p>
        ) : itemTypesQuery.data.length === 0 ? (
          <p>Item types are empty. Please refresh.</p>
        ) : (
          <Form
            form={form}
            onSubmit={onCreateItem}
            creatingItemError={createItemMutation.error?.message ?? ''}
            isBusy={isBusy}
            itemTypes={itemTypesQuery.data}
          />
        )}
      </div>
    </main>
  );
}
