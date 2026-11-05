import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import type { Item } from '@/types/inventory.types';

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
  onStartUpdate: (item: Item) => void;
};

export const ItemCard = ({
  item,
  isBusy,
  isSpotPricesLoading,
  spotPricesError,
  spotPrice,
  spotPricesTimestamp,
  onDelete,
  onStartUpdate,
}: ItemCardProps) => {
  const { id, quantity, item_type, acquisition_date } = item;
  const { name, weight_unit, weight, purity } = item_type;

  const [manageSectionState, setManageSectionState] = useState<'closed' | 'manage' | 'transactions'>('closed');

  const itemTransactionsQuery = useQuery({
    queryKey: ['itemTransactions', id],
    queryFn: () => fetchTransactions(id),
    enabled: manageSectionState === 'transactions',
  });

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
            onClick={() => onDelete(id)}
            disabled={isBusy}
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
            <p>Error loading transactions.</p>
          ) : itemTransactionsQuery.data.length > 0 ? (
            itemTransactionsQuery.data.map((transaction) => (
              <div key={transaction.id}>
                <p>Type: {transaction.type}</p>
                <p>Quantity: {transaction.quantity}</p>
                <p>Effective date: {transaction.effective_date}</p>
              </div>
            ))
          ) : (
            <p>No transactions found.</p>
          )}
        </div>
      )}

      <div className="flex w-full justify-between">
        <button
          className="text-blue-500 hover:cursor-pointer hover:underline"
          type="button"
          onClick={() => setManageSectionState((prevState) => (prevState === 'closed' ? 'manage' : 'closed'))}
          disabled={isBusy}
          aria-expanded={manageSectionState !== 'closed' ? 'true' : 'false'}
        >
          {manageSectionState === 'closed' ? 'manage' : 'cancel'}
        </button>
      </div>
    </>
  );
};
