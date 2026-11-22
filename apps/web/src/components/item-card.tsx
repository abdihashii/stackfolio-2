import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import type { Item, Transaction } from '@/types/inventory.types';

import { EditTransactionForm } from '@/components/edit-transaction-form';
import { RecordSaleForm } from '@/components/record-sale-form';
import { useTransactionMutations } from '@/hooks/use-transaction-mutations';
import { fetchTransactions } from '@/lib/apis';
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
  const { id, quantity, item_type } = item;
  const { name, weight_unit, weight, purity } = item_type;

  const [manageSectionState, setManageSectionState] = useState<'closed' | 'manage' | 'transactions' | 'delete'>(
    'closed',
  );
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [transactionPage, setTransactionPage] = useState<number>(1);
  const [sellingTransactionId, setSellingTransactionId] = useState<string | null>(null);

  const { updateTransactionMutation, saleMutation, deleteTransactionMutation } = useTransactionMutations(id, {
    onTransactionUpdated: () => setEditingTransaction(null),
    onSaleRecorded: () => setSellingTransactionId(null),
  });
  const itemTransactionsQuery = useQuery({
    queryKey: ['itemTransactions', id, transactionPage],
    queryFn: () => fetchTransactions(id, transactionPage),
    enabled: manageSectionState === 'transactions',
  });

  const isTransactionBusy =
    isBusy || updateTransactionMutation.isPending || saleMutation.isPending || deleteTransactionMutation.isPending;
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
                {editingTransaction?.id === transaction.id ? (
                  <EditTransactionForm
                    transaction={editingTransaction}
                    disabled={isTransactionBusy}
                    isSaving={updateTransactionMutation.isPending}
                    errorMessage={updateTransactionMutation.error?.message}
                    onSave={(body) => updateTransactionMutation.mutate({ transactionId: transaction.id, body })}
                    onCancel={() => {
                      setEditingTransaction(null);
                      updateTransactionMutation.reset();
                    }}
                  />
                ) : sellingTransactionId === transaction.id ? (
                  <RecordSaleForm
                    transaction={transaction}
                    disabled={isTransactionBusy}
                    isSaving={saleMutation.isPending}
                    errorMessage={saleMutation.error?.message}
                    onSave={(payload) => saleMutation.mutate({ ...payload, buy_id: transaction.id })}
                    onCancel={() => {
                      setSellingTransactionId(null);
                      saleMutation.reset();
                    }}
                  />
                ) : (
                  <>
                    <p>Type: {transaction.type}</p>
                    <p>
                      {transaction.type === 'buy' ? 'Bought' : 'Sold'}: {transaction.quantity}
                    </p>
                    <p>Effective date: {transaction.effective_date}</p>
                    <button
                      type="button"
                      disabled={isTransactionBusy}
                      className="text-blue-500 hover:cursor-pointer hover:underline"
                      onClick={() => {
                        updateTransactionMutation.reset();
                        setSellingTransactionId(null);
                        setEditingTransaction(transaction);
                      }}
                    >
                      edit
                    </button>
                    <button
                      type="button"
                      disabled={isTransactionBusy}
                      className="ml-3 text-red-500 hover:cursor-pointer hover:underline"
                      onClick={() => {
                        deleteTransactionMutation.mutate({ transactionId: transaction.id });
                      }}
                    >
                      delete
                    </button>
                    {transaction.type === 'buy' && (
                      <>
                        <button
                          type="button"
                          disabled={(transaction.remaining_quantity ?? 0) <= 0 || isTransactionBusy}
                          className="ml-3 text-green-500 hover:cursor-pointer hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                          onClick={() => {
                            setEditingTransaction(null);
                            saleMutation.reset();
                            setSellingTransactionId(transaction.id);
                          }}
                        >
                          {transaction.remaining_quantity === 0 ? 'fully sold' : 'sell'}
                        </button>
                        <p>Available: {transaction.remaining_quantity}</p>
                        <p>
                          Total paid: {transaction.total_paid == null ? 'Unknown' : formatUsd(transaction.total_paid)}
                        </p>
                      </>
                    )}
                    {deleteTransactionMutation.isError &&
                      deleteTransactionMutation.variables?.transactionId === transaction.id && (
                        <p role="alert" className="text-red-500">
                          {deleteTransactionMutation.error.message}
                        </p>
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
                  setEditingTransaction(null);
                  setSellingTransactionId(null);
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
                  setEditingTransaction(null);
                  setSellingTransactionId(null);
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
            setEditingTransaction(null);
            setSellingTransactionId(null);
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
