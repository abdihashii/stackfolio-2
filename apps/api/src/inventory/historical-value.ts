import type { Item } from './entities/item.entity.js';

export function calculateHistoricalValue(
  inventory: Item[],
  date: string,
  prices: Partial<Record<'gold' | 'silver', number>>,
): number | null {
  let total = 0;

  for (const item of inventory) {
    const itemType = item.item_type;
    const startDate = item.acquisition_date ?? item.created_at.toISOString().slice(0, 10);

    if (startDate > date) continue;

    const spotPrice = prices[itemType.metal];
    if (spotPrice === undefined) return null;

    const weightOzt = itemType.weight_unit === 'gram' ? itemType.weight / 31.1034768 : itemType.weight;

    total += weightOzt * itemType.purity * item.quantity * spotPrice;
  }

  return total;
}
