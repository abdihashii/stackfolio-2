import { calculateBuySpotValue, calculateUnrealizedGain, formatUsd } from '@/lib/utils';
import { ItemType, Transaction } from '@/types/inventory.types';

export const BuyDetails = ({
  transaction,
  isTransactionBusy,
  onSell,
  itemType,
  spotPrice,
}: {
  transaction: Transaction;
  isTransactionBusy: boolean;
  onSell: (transactionId: string | null) => void;
  itemType: ItemType;
  spotPrice: number | undefined;
}) => {
  const spotValue =
    transaction.remaining_quantity === 0
      ? '0'
      : spotPrice === undefined || transaction.remaining_quantity === undefined
        ? null
        : calculateBuySpotValue(itemType.weight_unit, itemType.weight, transaction.remaining_quantity, spotPrice);
  const unrealizedGain =
    transaction.remaining_quantity === 0
      ? '0'
      : transaction.remaining_purchase_cost == null || spotValue == null
        ? null
        : calculateUnrealizedGain(spotValue, transaction.remaining_purchase_cost);

  return (
    <>
      <button
        type="button"
        disabled={(transaction.remaining_quantity ?? 0) <= 0 || isTransactionBusy}
        className="ml-3 text-green-500 hover:cursor-pointer hover:underline disabled:cursor-not-allowed disabled:opacity-50"
        onClick={() => onSell(transaction.id)}
      >
        {transaction.remaining_quantity === 0 ? 'fully sold' : 'sell'}
      </button>
      <p>Available: {transaction.remaining_quantity}</p>
      <p>Total paid: {transaction.total_paid == null ? 'Unknown' : formatUsd(transaction.total_paid)}</p>
      <p>
        Cost basis:{' '}
        {transaction.remaining_purchase_cost == null ? 'Unknown' : formatUsd(transaction.remaining_purchase_cost)}
      </p>
      <p>Current spot value: {spotValue !== null ? formatUsd(spotValue) : 'Unavailable'}</p>
      <p>Unrealized gain/loss: {unrealizedGain !== null ? formatUsd(unrealizedGain) : 'Unavailable'}</p>
    </>
  );
};
