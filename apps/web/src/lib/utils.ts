import type { Holding } from "../types/holdings.types";

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

export const calculateHoldingValue = ({ weight_unit, weight, purity, quantity }: Holding, spotPrice: number): number => {
  const weightOzt = weight_unit === 'gram' ? gramsToTroyOunces(weight) : weight;

  return weightOzt * purity * quantity * spotPrice;
};

export const calculateStackValue = (
  holdings: Holding[] | undefined,
  spotPrices: Record<'gold' | 'silver', number | undefined>,
): number | undefined => {
  if (holdings === undefined) return undefined;
  let stackValue = 0;
  for (const holding of holdings) {
    const spotPrice = spotPrices[holding.metal];
    if (spotPrice === undefined) return undefined;
    stackValue += calculateHoldingValue(holding, spotPrice);
  }

  return stackValue;
};
