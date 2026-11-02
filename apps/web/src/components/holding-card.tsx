import type { Holding } from '@/types/holdings.types';

import { formatUsd, calculateHoldingValue } from '@/lib/utils';

type HoldingCardProps = {
  holding: Holding;
  isBusy: boolean;
  isSpotPricesLoading: boolean;
  spotPricesError: string;
  spotPrice: number | undefined;
  spotPricesTimestamp: string;
  onDelete: (id: string) => Promise<void>;
  onStartUpdate: (holding: Holding) => void;
};

export const HoldingCard = ({
  holding,
  isBusy,
  isSpotPricesLoading,
  spotPricesError,
  spotPrice,
  spotPricesTimestamp,
  onDelete,
  onStartUpdate,
}: HoldingCardProps) => {
  const { id, metal, weight_unit, weight, purity, quantity, holding_type } = holding;

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
      {holding_type && <p>{holding_type}</p>}
      {isSpotPricesLoading ? (
        <p>Holding value: loading...</p>
      ) : spotPricesError ? (
        <p>{spotPricesError}</p>
      ) : spotPrice !== undefined ? (
        <>
          <p className="mt-2 text-sm text-gray-500 wrap-break-word">
            Price snapshot: {new Date(spotPricesTimestamp).toISOString()}
          </p>

          <p className="mt-3 font-semibold">Holding value: {formatUsd(calculateHoldingValue(holding, spotPrice))}</p>
        </>
      ) : (
        <p className="mt-3 font-semibold">Holding value: Unavailable</p>
      )}

      <div className="w-full flex justify-between">
        <button
          className="text-blue-500 hover:cursor-pointer hover:underline"
          type="button"
          onClick={() => onStartUpdate(holding)}
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
