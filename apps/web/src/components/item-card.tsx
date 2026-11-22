import { useState } from 'react';

import type { Item, Transaction } from '@/types/inventory.types';

import { ItemTransactions } from '@/components/item-transactions';
import { useTransactionMutations } from '@/hooks/use-transaction-mutations';
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

  const mutations = useTransactionMutations(id, {
    onTransactionUpdated: () => setEditingTransaction(null),
    onSaleRecorded: () => setSellingTransactionId(null),
  });
  const { updateTransactionMutation, saleMutation, deleteTransactionMutation } = mutations;
  const isTransactionBusy =
    isBusy || updateTransactionMutation.isPending || saleMutation.isPending || deleteTransactionMutation.isPending;

  const clearActiveForm = () => {
    setEditingTransaction(null);
    setSellingTransactionId(null);
    updateTransactionMutation.reset();
  };

  const changeTransactionPage = (page: number) => {
    clearActiveForm();
    setTransactionPage(page);
  };

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
        <ItemTransactions
          id={id}
          transactionPage={transactionPage}
          editingTransaction={editingTransaction}
          sellingTransactionId={sellingTransactionId}
          isTransactionBusy={isTransactionBusy}
          mutations={mutations}
          onPageChange={changeTransactionPage}
          onPageCorrection={setTransactionPage}
          onEdit={(transaction) => {
            updateTransactionMutation.reset();
            setSellingTransactionId(null);
            setEditingTransaction(transaction);
          }}
          onSell={(transactionId) => {
            saleMutation.reset();
            setEditingTransaction(null);
            setSellingTransactionId(transactionId);
          }}
        />
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
            clearActiveForm();
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
