import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import type { Item } from '@/types/inventory.types';

import { fetchTransactions, updateTransaction } from '@/lib/apis';
import { calculateItemValue, formatUsd } from '@/lib/utils';

type ItemCardProps = {
  item: Item;
  isBusy: boolean;
  isSpotPricesLoading: boolean;
  spotPricesError: string;
  spotPrice: number | undefined;
  spotPricesTimestamp: string;
  onDelete: (id: string) => Promise<void>;
};

export const ItemCard = ({
  item,
  isBusy,
  isSpotPricesLoading,
  spotPricesError,
  spotPrice,
  spotPricesTimestamp,
  onDelete,
}: ItemCardProps) => {
  const { id, quantity, item_type, acquisition_date } = item;
  const { name, weight_unit, weight, purity } = item_type;

  const [manageSectionState, setManageSectionState] = useState<'closed' | 'manage' | 'transactions' | 'delete'>(
    'closed',
  );
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
  const [transactionPage, setTransactionPage] = useState<number>(1);

  const queryClient = useQueryClient();
  const updateTransactionMutation = useMutation({
    mutationFn: ({ transactionId, quantity }: { transactionId: string; quantity: number }) =>
      updateTransaction(id, transactionId, quantity),
    onSuccess: async () => {
      setEditingTransactionId(null);
      try {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['itemTransactions', id] }, { throwOnError: true }),
          queryClient.invalidateQueries({ queryKey: ['inventory'] }, { throwOnError: true }),
          queryClient.invalidateQueries({ queryKey: ['valuation'] }, { throwOnError: true }),
        ]);
      } catch {
        alert('Transaction saved, but could not refresh. Reload the page.');
      }
    },
  });
  const itemTransactionsQuery = useQuery({
    queryKey: ['itemTransactions', id, transactionPage],
    queryFn: () => fetchTransactions(id, transactionPage),
    enabled: manageSectionState === 'transactions',
  });

  const isTransactionBusy = isBusy || updateTransactionMutation.isPending;
  const transactionsTotal = itemTransactionsQuery.data?.total ?? 0;
  const totalTransactionPages = Math.max(1, Math.ceil(transactionsTotal / 2));

  // Return to the last valid page when refreshed inventory shrinks.
  useEffect(() => {
    if (itemTransactionsQuery.isSuccess && transactionPage > totalTransactionPages) {
      setTransactionPage(totalTransactionPages);
    }
  }, [itemTransactionsQuery.isSuccess, transactionPage, totalTransactionPages]);

  return (
    <>
      <h3 className="text-lg font-semibold capitalize">{name}</h3>
      <p>
        Weight: {weight} {weight_unit}
      </p>
      <p>Purity: {purity}</p>
      <p>Quantity: {quantity}</p>
      <p>
        Total weight: {weight * quantity} {weight_unit}
      </p>
      {acquisition_date && <p>Acquisition date: {acquisition_date}</p>}
      {isSpotPricesLoading ? (
        <p>Item value: loading...</p>
      ) : spotPricesError ? (
        <p>{spotPricesError}</p>
      ) : spotPrice !== undefined ? (
        <>
          <p className="mt-2 text-sm wrap-break-word text-gray-500">
            Price snapshot: {new Date(spotPricesTimestamp).toISOString()}
          </p>

          <p className="mt-3 font-semibold">Item value: {formatUsd(calculateItemValue(item, spotPrice))}</p>
        </>
      ) : (
        <p className="mt-3 font-semibold">Item value: Unavailable</p>
      )}

      {manageSectionState === 'manage' && (
        <div className="flex w-full justify-between rounded-md border border-gray-300 px-4 py-2">
          <button type="button" className="hover:cursor-pointer" onClick={() => setManageSectionState('transactions')}>
            edit transactions
          </button>
          <button type="button" disabled className="hover:cursor-pointer">
            sell
          </button>
          <button
            className="text-red-500 hover:cursor-pointer hover:underline"
            type="button"
            onClick={() => setManageSectionState('delete')}
            disabled={isTransactionBusy}
          >
            delete item
          </button>
        </div>
      )}

      {manageSectionState === 'transactions' && (
        <div className="flex w-full flex-col gap-2 rounded-md border border-gray-300 px-4 py-2">
          {itemTransactionsQuery.isPending ? (
            <p>Loading transactions...</p>
          ) : itemTransactionsQuery.isError ? (
            <div>
              <p>Error loading transactions.</p>
              <button
                type="button"
                className="rounded-md bg-gray-900 px-4 py-2 font-semibold text-white hover:cursor-pointer hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => itemTransactionsQuery.refetch()}
              >
                retry
              </button>
            </div>
          ) : itemTransactionsQuery.data.transactions.length > 0 ? (
            itemTransactionsQuery.data.transactions.map((transaction) => (
              <div key={transaction.id}>
                {editingTransactionId === transaction.id ? (
                  <form
                    className="flex flex-col gap-2"
                    onSubmit={(event) => {
                      event.preventDefault();
                      if (isTransactionBusy) return;
                      const data = new FormData(event.currentTarget);
                      updateTransactionMutation.mutate({
                        transactionId: transaction.id,
                        quantity: Number(data.get('quantity')),
                      });
                    }}
                  >
                    <p>Buy on {transaction.effective_date}</p>
                    <label htmlFor={`quantity-${transaction.id}`}>Quantity:</label>
                    <input
                      id={`quantity-${transaction.id}`}
                      name="quantity"
                      type="number"
                      defaultValue={transaction.quantity}
                      min="1"
                      max="2147483647"
                      step="1"
                      required
                      disabled={isTransactionBusy}
                      className="w-full rounded-md border border-gray-300 px-3 py-2"
                    />
                    <div className="flex gap-3">
                      <button
                        type="submit"
                        disabled={isTransactionBusy}
                        className="text-blue-500 hover:cursor-pointer hover:underline"
                      >
                        {updateTransactionMutation.isPending ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        type="button"
                        disabled={isTransactionBusy}
                        onClick={() => {
                          setEditingTransactionId(null);
                          updateTransactionMutation.reset();
                        }}
                        className="text-red-500 hover:cursor-pointer hover:underline"
                      >
                        Cancel edit
                      </button>
                    </div>
                    {updateTransactionMutation.isError && (
                      <p role="alert" className="text-red-500">
                        {updateTransactionMutation.error.message}
                      </p>
                    )}
                  </form>
                ) : (
                  <>
                    <p>Type: {transaction.type}</p>
                    <p>
                      {transaction.type === 'buy' ? 'Bought' : 'Sold'}: {transaction.quantity}
                    </p>
                    <p>Effective date: {transaction.effective_date}</p>
                    {transaction.type === 'buy' && (
                      <>
                        <p>Available: {transaction.remaining_quantity}</p>
                        <button
                          type="button"
                          disabled={isTransactionBusy}
                          className="text-blue-500 hover:cursor-pointer hover:underline"
                          onClick={() => {
                            updateTransactionMutation.reset();
                            setEditingTransactionId(transaction.id);
                          }}
                        >
                          edit
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            ))
          ) : (
            <p>No transactions found.</p>
          )}

          {itemTransactionsQuery.isSuccess && (
            <div className="flex w-full items-center justify-between gap-2 rounded-md border border-gray-300 px-4 py-2">
              <button
                type="button"
                disabled={transactionPage <= 1 || isTransactionBusy}
                className="hover:cursor-pointer disabled:text-gray-300 disabled:hover:cursor-not-allowed"
                onClick={() => {
                  setEditingTransactionId(null);
                  updateTransactionMutation.reset();
                  setTransactionPage((prevPage) => Math.max(prevPage - 1, 1));
                }}
                aria-label="Previous page"
              >
                {'<'}
              </button>
              <p>
                Page {transactionPage} of {totalTransactionPages}
              </p>
              <button
                type="button"
                disabled={transactionPage >= totalTransactionPages || isTransactionBusy}
                className="hover:cursor-pointer disabled:text-gray-300 disabled:hover:cursor-not-allowed"
                onClick={() => {
                  setEditingTransactionId(null);
                  updateTransactionMutation.reset();
                  setTransactionPage((prevPage) => Math.min(totalTransactionPages, prevPage + 1));
                }}
                aria-label="Next page"
              >
                {'>'}
              </button>
            </div>
          )}
        </div>
      )}

      {manageSectionState === 'delete' && (
        <div className="flex w-full flex-col gap-2 rounded-md border border-gray-300 px-4 py-2">
          <p className="text-sm text-gray-500">
            Delete this item and all its transactions? This permanently removes its history and cannot be undone.
          </p>
          <div className="flex w-full justify-between">
            <button
              type="button"
              disabled={isTransactionBusy}
              className="hover:cursor-pointer hover:underline"
              onClick={() => setManageSectionState('manage')}
            >
              cancel
            </button>
            <button
              className="text-red-500 hover:cursor-pointer hover:underline"
              type="button"
              onClick={() => onDelete(id)}
              disabled={isTransactionBusy}
            >
              delete permanently
            </button>
          </div>
        </div>
      )}

      <div className="flex w-full justify-between">
        <button
          className="text-blue-500 hover:cursor-pointer hover:underline"
          type="button"
          onClick={() => {
            setEditingTransactionId(null);
            updateTransactionMutation.reset();
            setManageSectionState((prevState) => (prevState === 'closed' ? 'manage' : 'closed'));
          }}
          disabled={isTransactionBusy}
          aria-expanded={manageSectionState !== 'closed' ? 'true' : 'false'}
        >
          {manageSectionState === 'closed' ? 'manage' : 'cancel'}
        </button>
      </div>
    </>
  );
};
