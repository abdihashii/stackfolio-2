export const metals = ['gold', 'silver'] as const;
export type Metal = (typeof metals)[number];

export const weightUnits = ['ozt', 'gram'] as const;
export type WeightUnit = (typeof weightUnits)[number];

export const holdingTypes = ['coin', 'bar', 'round', 'jewelry'] as const;
export type HoldingType = (typeof holdingTypes)[number];

export interface CreateHoldingInput {
  metal: Metal;
  weight_unit: WeightUnit;
  weight: number;
  purity: number;
  quantity: number;
  holding_type: HoldingType | null;
  acquisition_date: string | null;
}

export interface Holding extends CreateHoldingInput {
  id: string;
}
