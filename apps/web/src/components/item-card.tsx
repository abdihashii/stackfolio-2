import type { Item } from '@/types/inventory.types';

import { formatUsd, calculateItemValue } from '@/lib/utils';

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
  const { id, metal, weight_unit, weight, purity, quantity, item_type, acquisition_date } = item;

  return (
    <>
      <h3 className="text-lg font-semibold capitalize">{metal}</h3>
      <p>
        Weight: {weight} {weight_unit}
      </p>
      <p>Purity: {purity}</p>
      <p>Quantity: {quantity}</p>
      <p>
        Total weight: {weight * quantity} {weight_unit}
      </p>
      {item_type && <p>Item type: {item_type}</p>}
      {acquisition_date && <p>Acquisition date: {acquisition_date}</p>}
      {isSpotPricesLoading ? (
        <p>Item value: loading...</p>
      ) : spotPricesError ? (
        <p>{spotPricesError}</p>
      ) : spotPrice !== undefined ? (
        <>
          <p className="mt-2 text-sm text-gray-500 wrap-break-word">
            Price snapshot: {new Date(spotPricesTimestamp).toISOString()}
          </p>

          <p className="mt-3 font-semibold">Item value: {formatUsd(calculateItemValue(item, spotPrice))}</p>
        </>
      ) : (
        <p className="mt-3 font-semibold">Item value: Unavailable</p>
      )}

      <div className="w-full flex justify-between">
        <button
          className="text-blue-500 hover:cursor-pointer hover:underline"
          type="button"
          onClick={() => onStartUpdate(item)}
          disabled={isBusy}
        >
          update
        </button>
        <button
          className="text-red-500 hover:cursor-pointer hover:underline"
          type="button"
          onClick={() => onDelete(id)}
          disabled={isBusy}
        >
          delete
        </button>
      </div>
    </>
  );
};
