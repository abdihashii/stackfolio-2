import * as z from 'zod';

export const metals = ['gold', 'silver'] as const;
export type Metal = (typeof metals)[number];

export const weightUnits = ['ozt', 'gram'] as const;
export type WeightUnit = (typeof weightUnits)[number];

export const itemCategories = ['coin', 'bar', 'round', 'jewelry'] as const;
export type ItemCategory = (typeof itemCategories)[number];

export type ItemType = {
  id: string;
  name: string;
  metal: Metal;
  weight: number;
  weight_unit: WeightUnit;
  purity: number;
};

export interface Item {
  id: string;
  created_at: Date;
  quantity: number;
  item_type: ItemType;
  acquisition_date: string | null;
}

export const isReceiptAmount = (value: string): value is `${number}` => /^(?:\d+|\d*\.\d{1,2})$/.test(value);
const isNonNegativeDecimalString = (value: string): value is `${number}` => /^\d+(?:\.\d+)?$/.test(value);

const transactionSchema = z.object({
  id: z.string(),
  created_at: z.string(),
  effective_date: z.string(),
  type: z.enum(['buy', 'sell']),
  quantity: z.number(),
  remaining_quantity: z.number().optional(),
  total_paid: z.string().refine(isReceiptAmount).nullable(),
  remaining_purchase_cost: z.string().refine(isNonNegativeDecimalString).nullable().optional(),
});
export type Transaction = z.infer<typeof transactionSchema>;

export const transactionListSchema = z.object({ transactions: z.array(transactionSchema), total: z.number() });

export type HistoryRange = '30D' | '1Y' | 'ALL';

export interface HistoryResponse {
  currency: 'USD';
  range: HistoryRange;
  points: {
    date: string;
    totalValue: number | null;
    costBasis: string | null;
    quoteTimestamps: {
      gold?: number;
      silver?: number;
    };
  }[];
}
