import type { Item } from './entities/item.entity.js';
import type { Transaction } from './entities/transaction.entity.js';

export function calculateHistoricalValue(
  transactions: Transaction[],
  date: string,
  prices: Partial<Record<'gold' | 'silver', number>>,
): number | null {
  let total = 0;
  const quantitiesByItem = new Map<string, { item: Item; quantity: number }>();
  const transactionTotalWeight: Record<'gold' | 'silver', number> = {
    gold: 0,
    silver: 0,
  };

  // Count how many of each item remain on this date. Adding buys and subtracting sales.
  for (const transaction of transactions) {
    const transactionType = transaction.type;
    const transactionQuantity = transaction.quantity;
    const transactionEffectiveDate = transaction.effective_date;
    const item = transaction.item;

    if (transactionEffectiveDate > date) continue;

    const quantity = quantitiesByItem.get(transaction.item.id)?.quantity ?? 0;
    quantitiesByItem.set(
      transaction.item.id,
      transactionType === 'buy'
        ? { item, quantity: quantity + transactionQuantity }
        : { item, quantity: quantity - transactionQuantity },
    );
  }

  // Calculate the remaining gold and silver weight in troy ounces.
  for (const { item, quantity } of quantitiesByItem.values()) {
    if (quantity === 0) continue;

    const { weight_unit: weightUnit, weight, metal } = item.item_type;

    const weightOzt = weightUnit === 'ozt' ? weight : weight / 31.1034768;
    const totalWeightOzt = quantity * weightOzt;

    transactionTotalWeight[metal] += totalWeightOzt;
  }

  // Calculate the total dollar value using the supplied prices.
  for (const metal of ['gold', 'silver'] as const) {
    const weight = transactionTotalWeight[metal];

    if (weight <= 0) continue;
    if (prices[metal] === undefined) return null;

    total += prices[metal] * weight;
  }

  return total;
}
