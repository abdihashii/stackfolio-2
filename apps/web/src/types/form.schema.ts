import * as z from 'zod';

import { itemCategories, metals, weightUnits } from './inventory.types';

export const schema = z.object({
  metal: z.enum(metals),
  weight_unit: z.enum(weightUnits),
  weight: z.number().positive(),
  purity: z.number().positive().max(1),
  quantity: z.number().int().positive().max(2147483647),
  item_type: z.enum(itemCategories).nullable(),
  acquisition_date: z.iso.date().nullable(),
});
export type FormValues = z.infer<typeof schema>;

export const buySchema = z.object({
  item_type_id: z.uuid(),
  quantity: z.number().int().positive().max(2147483647),
  acquisition_date: z.iso.date().nullable(),
});
export type BuyFormValues = z.infer<typeof buySchema>;
