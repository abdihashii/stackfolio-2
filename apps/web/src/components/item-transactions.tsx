import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';

import type { useTransactionMutations } from '@/hooks/use-transaction-mutations';
import type { Item, Transaction } from '@/types/inventory.types';

import { EditTransactionForm } from '@/components/edit-transaction-form';
import { RecordSaleForm } from '@/components/record-sale-form';
import { fetchTransactions } from '@/lib/apis';

import { BuyDetails } from './buy-details';

type ItemTransactionsProps = {
  item: Item;
  transactionPage: number;
  editingTransaction: Transaction | null;
  sellingTransactionId: string | null;
  isTransactionBusy: boolean;
  mutations: ReturnType<typeof useTransactionMutations>;
  onPageChange: (page: number) => void;
  onPageCorrection: (page: number) => void;
  onEdit: (transaction: Transaction | null) => void;
  onSell: (transactionId: string | null) => void;
  spotPrice: number | undefined;
};

export const ItemTransactions = ({
  item,
  transactionPage,
  editingTransaction,
  sellingTransactionId,
  isTransactionBusy,
  mutations: { updateTransactionMutation, saleMutation, deleteTransactionMutation },
  onPageChange,
  onPageCorrection,
  onEdit,
  onSell,
  spotPrice,
}: ItemTransactionsProps) => {
  const itemTransactionsQuery = useQuery({
    queryKey: ['itemTransactions', item.id, transactionPage],
    queryFn: () => fetchTransactions(item.id, transactionPage),
  });
  const transactionsTotal = itemTransactionsQuery.data?.total ?? 0;
  const totalTransactionPages = Math.max(1, Math.ceil(transactionsTotal / 2));

  // Return to the last valid page when refreshed inventory shrinks.
  useEffect(() => {
    if (itemTransactionsQuery.isSuccess && transactionPage > totalTransactionPages) {
      onPageCorrection(totalTransactionPages);
    }
  }, [itemTransactionsQuery.isSuccess, transactionPage, totalTransactionPages, onPageCorrection]);

  return (
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
                submittedChanges={
                  updateTransactionMutation.variables?.transactionId === editingTransaction.id
                    ? updateTransactionMutation.variables.body
                    : undefined
                }
                disabled={isTransactionBusy}
                isSaving={updateTransactionMutation.isPending}
                errorMessage={updateTransactionMutation.error?.message}
                onSave={(body) => updateTransactionMutation.mutate({ transactionId: transaction.id, body })}
                onCancel={() => onEdit(null)}
              />
            ) : sellingTransactionId === transaction.id ? (
              <RecordSaleForm
                transaction={transaction}
                disabled={isTransactionBusy}
                isSaving={saleMutation.isPending}
                errorMessage={saleMutation.error?.message}
                onSave={(payload) => saleMutation.mutate({ ...payload, buy_id: transaction.id })}
                onCancel={() => onSell(null)}
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
                  onClick={() => onEdit(transaction)}
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
                  <BuyDetails
                    transaction={transaction}
                    isTransactionBusy={isTransactionBusy}
                    onSell={onSell}
                    itemType={item.item_type}
                    spotPrice={spotPrice}
                  />
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
            onClick={() => onPageChange(Math.max(transactionPage - 1, 1))}
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
            onClick={() => onPageChange(Math.min(totalTransactionPages, transactionPage + 1))}
            aria-label="Next page"
          >
            {'>'}
          </button>
        </div>
      )}
    </div>
  );
};
