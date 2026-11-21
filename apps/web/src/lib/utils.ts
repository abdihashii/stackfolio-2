import type { Item } from '../types/inventory.types';

export const gramsToTroyOunces = (gramWeightUnit: number) => {
  // 1 troy ounce = 31.1034768 grams
  return gramWeightUnit / 31.1034768;
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
