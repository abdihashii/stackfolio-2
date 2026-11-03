export const metals = ['gold', 'silver'] as const;
export type Metal = (typeof metals)[number];

export const weightUnits = ['ozt', 'gram'] as const;
export type WeightUnit = (typeof weightUnits)[number];

export const itemTypes = ['coin', 'bar', 'round', 'jewelry'] as const;
export type ItemType = (typeof itemTypes)[number];

export interface CreateItemInput {
  metal: Metal;
  weight_unit: WeightUnit;
  weight: number;
  purity: number;
  quantity: number;
  item_type: ItemType | null;
  acquisition_date: string | null;
}

export interface Item extends CreateItemInput {
  id: string;
}
