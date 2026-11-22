import Decimal from 'decimal.js-light';

import type { Item } from '../types/inventory.types';

const gramsPerTroyOunce = 31.1034768;

export const gramsToTroyOunces = (gramWeightUnit: number) => {
  return gramWeightUnit / gramsPerTroyOunce;
};

export const formatUsd = (value: number | `${number}`) => {
  if (typeof value === 'string') {
    const [dollars, cents = ''] = value.split('.');
    return `$${BigInt(dollars || '0').toLocaleString('en-US')}.${cents.padEnd(2, '0')}`;
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
