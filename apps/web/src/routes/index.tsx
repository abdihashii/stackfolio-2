import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Line, LineChart, Tooltip, XAxis, YAxis } from 'recharts';

import { Form } from '@/components/form';
import { ItemCard } from '@/components/item-card';
import { H2 } from '@/components/ui/h2';
import { usePurchaseItem } from '@/hooks/use-create-item';
import { useDeleteItem } from '@/hooks/use-delete-item';
import { fetchHistory, fetchInventory, fetchItemTypes, fetchValuation } from '@/lib/apis';
import { calculateBuySpotValue, calculateStackUnrealizedGain, formatUsd } from '@/lib/utils';
import { HistoryRange } from '@/types/inventory.types';

const pageSize = 12;

export const Route = createFileRoute('/')({
  component: Home,
});

function Home() {
  const [page, setPage] = useState(1);
  const [range, setRange] = useState<HistoryRange>('ALL');

  const inventoryQuery = useQuery({
    queryKey: ['inventory', page, pageSize],
    queryFn: () => fetchInventory(page, pageSize),
  });
  const itemTypesQuery = useQuery({ queryKey: ['itemTypes'], queryFn: fetchItemTypes });
  const valuationQuery = useQuery({
    queryKey: ['valuation'],
    queryFn: () => fetchValuation(),
  });
  const historyQuery = useQuery({
    queryKey: ['history', range],
    queryFn: () => fetchHistory(range),
  });

  const { form, purchaseItemMutation, onPurchaseItem } = usePurchaseItem(inventoryQuery.isPending, setPage);
  const isBusyWithoutDelete = form.formState.isSubmitting || purchaseItemMutation.isPending || inventoryQuery.isPending;
  const { deleteItemMutation, onDeleteItem } = useDeleteItem(isBusyWithoutDelete);

  const isBusy = isBusyWithoutDelete || deleteItemMutation.isPending;
  const totalItems = inventoryQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Return to the last valid page when refreshed inventory shrinks.
  useEffect(() => {
    if (inventoryQuery.isSuccess && page > totalPages) {
      setPage(totalPages);
    }
  }, [inventoryQuery.isSuccess, page, totalPages]);

  const stackUnrealizedGain = valuationQuery.isSuccess
    ? calculateStackUnrealizedGain(
        valuationQuery.data.buyBalances.map((buyBalance) => {
          const spotPrice = valuationQuery.data.quote.prices[buyBalance.metal];

          return {
            remaining_quantity: Number(buyBalance.remaining_quantity),
            remaining_purchase_cost: buyBalance.remaining_purchase_cost,
            spotValue: calculateBuySpotValue(
              buyBalance.weight_unit,
              buyBalance.weight,
              Number(buyBalance.remaining_quantity),
              spotPrice,
            ),
          };
        }),
      )
    : null;

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
        <p>
          Unrealized gain/loss:{' '}
          {valuationQuery.isPending
            ? 'loading...'
            : valuationQuery.isError
              ? valuationQuery.error.message
              : stackUnrealizedGain == null
                ? 'Unavailable'
                : formatUsd(stackUnrealizedGain)}
        </p>
        <p className="text-gray-500">
          Based on weight, purity, quantity, and spot price. Actual resale value may differ.
        </p>
      </div>

      <fieldset className="flex gap-1">
        <legend>Chart range</legend>
        <label className="rounded border border-black px-2 py-1 hover:cursor-pointer has-checked:bg-gray-900 has-checked:text-white has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-gray-900">
          30D
          <input
            name="history-range"
            type="radio"
            checked={range === '30D'}
            onChange={() => setRange('30D')}
            className="sr-only"
          />
        </label>

        <label className="rounded border border-black px-2 py-1 hover:cursor-pointer has-checked:bg-gray-900 has-checked:text-white has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-gray-900">
          1Y
          <input
            name="history-range"
            type="radio"
            checked={range === '1Y'}
            onChange={() => setRange('1Y')}
            className="sr-only"
          />
        </label>

        <label className="rounded border border-black px-2 py-1 hover:cursor-pointer has-checked:bg-gray-900 has-checked:text-white has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-gray-900">
          All
          <input
            name="history-range"
            type="radio"
            checked={range === 'ALL'}
            onChange={() => setRange('ALL')}
            className="sr-only"
          />
        </label>
      </fieldset>

      <div>
        {historyQuery.isPending ? (
          <p role="status">Loading history...</p>
        ) : historyQuery.isError ? (
          <>
            <p role="alert">{historyQuery.error.message}</p>
            <button type="button" onClick={() => historyQuery.refetch()}>
              retry
            </button>
          </>
        ) : historyQuery.data.points.length === 0 ? (
          <p>No history. Record your first purchase to see it here.</p>
        ) : historyQuery.data.points.every((point) => point.totalValue === null) ? (
          <p role="alert">Historical values are unavailable for this range.</p>
        ) : (
          <LineChart
            title="Historical stack value"
            data={historyQuery.data.points}
            responsive
            width="100%"
            height={280}
          >
            <XAxis dataKey="date" />
            <YAxis width="auto" tickFormatter={(value) => `$${value}`} />
            <Line dataKey="totalValue" type="linear" />
            <Tooltip
              filterNull={false}
              content={({ active, label }) => {
                if (!active) return null;

                const point = historyQuery.data.points.find(({ date }) => date === label);
                if (!point) return null;

                return (
                  <div role="status" className="rounded border border-gray-300 bg-white p-2 text-sm">
                    <p className="font-semibold">{point.date}</p>
                    <p>Stack value: {point.totalValue === null ? 'Unavailable' : formatUsd(point.totalValue)}</p>
                    {(['gold', 'silver'] as const).map((metal) => {
                      const timestamp = point.quoteTimestamps[metal];
                      if (timestamp === undefined) return null;

                      return (
                        <p key={metal}>
                          <span className="capitalize">{metal}</span> quote:{' '}
                          {new Date(timestamp * 1000).toISOString().slice(0, 10)}
                        </p>
                      );
                    })}
                  </div>
                );
              }}
            />
          </LineChart>
        )}
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        {inventoryQuery.isPending ? (
          <p>loading...</p>
        ) : inventoryQuery.isError ? (
          <div>
            <p>{inventoryQuery.error.message}</p>
            <button
              type="button"
              className="rounded-md bg-gray-900 px-4 py-2 font-semibold text-white hover:cursor-pointer hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => inventoryQuery.refetch()}
            >
              retry
            </button>
          </div>
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
            ) : totalItems === 0 ? (
              <p>No inventory yet. Add your first item below.</p>
            ) : (
              <p>No items on this page.</p>
            )}

            <div className="col-span-full flex w-full items-center justify-between gap-2 rounded-md border border-gray-300 px-4 py-2">
              <button
                disabled={page <= 1 || isBusy}
                className="hover:cursor-pointer disabled:text-gray-300 disabled:hover:cursor-not-allowed"
                onClick={() => setPage((prevPage) => prevPage - 1)}
                aria-label="Previous page"
              >
                {'<'}
              </button>
              <p>
                Page: {page} of {totalPages}
              </p>
              <button
                disabled={page >= totalPages || isBusy}
                className="hover:cursor-pointer disabled:text-gray-300 disabled:hover:cursor-not-allowed"
                onClick={() => setPage((prevPage) => prevPage + 1)}
                aria-label="Next page"
              >
                {'>'}
              </button>
            </div>
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
            onSubmit={onPurchaseItem}
            purchasingItemError={purchaseItemMutation.error?.message ?? ''}
            isBusy={isBusy}
            itemTypes={itemTypesQuery.data}
          />
        )}
      </div>
    </main>
  );
}
