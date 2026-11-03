import type { Item } from './entities/item.entity.js';

export function calculateHistoricalValue(
  inventory: Item[],
  date: string,
  prices: Partial<Record<'gold' | 'silver', number>>,
): number | null {
  let total = 0;

  for (const item of inventory) {
    const startDate = item.acquisition_date ?? item.created_at.toISOString().slice(0, 10);

    if (startDate > date) continue;

    const spotPrice = prices[item.metal];
    if (spotPrice === undefined) return null;

    const weightOzt = item.weight_unit === 'gram' ? item.weight / 31.1034768 : item.weight;

    total += weightOzt * item.purity * item.quantity * spotPrice;
  }

  return total;
}
