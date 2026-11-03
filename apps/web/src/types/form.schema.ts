import * as z from 'zod';

import { metals, weightUnits, itemTypes } from './inventory.types';

export const schema = z.object({
  metal: z.enum(metals),
  weight_unit: z.enum(weightUnits),
  weight: z.number().positive(),
  purity: z.number().positive().max(1),
  quantity: z.number().int().positive().max(2147483647),
  item_type: z.enum(itemTypes).nullable(),
  acquisition_date: z.iso.date().nullable(),
});
export type FormValues = z.infer<typeof schema>;
