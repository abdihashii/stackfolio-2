import type { Holding } from './entities/holding.entity.js';

export function calculateHistoricalValue(
  holdings: Holding[],
  date: string,
  prices: Partial<Record<'gold' | 'silver', number>>,
): number | null {
  let total = 0;

  for (const holding of holdings) {
    const startDate = holding.acquisition_date ?? holding.created_at.toISOString().slice(0, 10);

    if (startDate > date) continue;

    const spotPrice = prices[holding.metal];
    if (spotPrice === undefined) return null;

    const weightOzt = holding.weight_unit === 'gram' ? holding.weight / 31.1034768 : holding.weight;

    total += weightOzt * holding.purity * holding.quantity * spotPrice;
  }

  return total;
}
