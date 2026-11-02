import * as z from 'zod';

import { metals, weightUnits, holdingTypes } from './holdings.types';

export const schema = z.object({
  metal: z.enum(metals),
  weight_unit: z.enum(weightUnits),
  weight: z.number().positive(),
  purity: z.number().positive().max(1),
  quantity: z.number().int().positive().max(2147483647),
  holding_type: z.enum(holdingTypes).nullable(),
});
export type FormValues = z.infer<typeof schema>;
