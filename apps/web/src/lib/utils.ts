import type { Item } from '../types/inventory.types';

export const gramsToTroyOunces = (gramWeightUnit: number) => {
  // 1 troy ounce = 31.1034768 grams
  return gramWeightUnit / 31.1034768;
};

export const formatUsd = (value: number) => {
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

export const calculateStackValue = (
  inventory: Item[] | undefined,
  spotPrices: Record<'gold' | 'silver', number | undefined>,
): number | undefined => {
  if (inventory === undefined) return undefined;
  let stackValue = 0;
  for (const item of inventory) {
    const spotPrice = spotPrices[item.item_type.metal];
    if (spotPrice === undefined) return undefined;
    stackValue += calculateItemValue(item, spotPrice);
  }

  return stackValue;
};
