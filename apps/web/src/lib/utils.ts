import Decimal from 'decimal.js-light';

import type { Item } from '../types/inventory.types';

const gramsPerTroyOunce = 31.1034768;

export const gramsToTroyOunces = (gramWeightUnit: number) => {
  return gramWeightUnit / gramsPerTroyOunce;
};

export const formatUsd = (value: number | string) => {
  if (typeof value === 'string') {
    const roundedAmount = new Decimal(value).toFixed(2, Decimal.ROUND_HALF_UP);
    const [dollars, cents = ''] = roundedAmount.split('.');
    const isNegative = dollars.startsWith('-');
    const unsignedDollars = dollars.replace(/^-/, '');
    return `${isNegative ? '-' : ''}$${BigInt(unsignedDollars || '0').toLocaleString('en-US')}.${cents.padEnd(2, '0')}`;
  }
  return Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
};

export const calculateItemValue = ({ item_type, quantity }: Item, spotPrice: number): number => {
  const { weight_unit, weight } = item_type;
  const fineMetalWeightOzt = weight_unit === 'gram' ? gramsToTroyOunces(weight) : weight;

  return fineMetalWeightOzt * quantity * spotPrice;
};

// Two finite JS number inputs and an integer quantity require at most 44 significant digits for the product.
const SpotDecimal = Decimal.clone({ precision: 64 });

export const calculateBuySpotValue = ({ item_type }: Item, remainingQuantity: number, spotPrice: number): string => {
  const value = new SpotDecimal(item_type.weight).times(remainingQuantity).times(spotPrice);
  return (item_type.weight_unit === 'gram' ? value.div(gramsPerTroyOunce) : value).toFixed();
};

export const calculateUnrealizedGain = (spotValue: number | string, remainingPurchaseCost: string): string => {
  const spot = new Decimal(spotValue).toFixed();
  // Keep all input digits even when a large receipt is paired with a fractional spot value.
  const Money = Decimal.clone({ precision: spot.length + remainingPurchaseCost.length });
  return new Money(spot).minus(remainingPurchaseCost).toFixed();
};

type BuyValuation = {
  remaining_quantity: number;
  remaining_purchase_cost: string | null;
  spotValue: string | null;
};

export const calculateStackUnrealizedGain = (buys: BuyValuation[]) => {
  let total = '0';
  for (const buy of buys) {
    if (buy.remaining_quantity === 0) continue; // A fully sold buy contributes zero even if its cost or spot value is unknown.
    if (buy.remaining_purchase_cost === null || buy.spotValue === null) return null;

    const gain = calculateUnrealizedGain(buy.spotValue, buy.remaining_purchase_cost);
    // Allow enough digits to preserve fractional cents when adding a small gain to a large total.
    const Money = Decimal.clone({ precision: total.length + gain.length });

    total = new Money(total).plus(gain).toFixed();
  }
  return total;
};
