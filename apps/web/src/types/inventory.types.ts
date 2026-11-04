export const metals = ['gold', 'silver'] as const;
export type Metal = (typeof metals)[number];

export const weightUnits = ['ozt', 'gram'] as const;
export type WeightUnit = (typeof weightUnits)[number];

export const itemCategories = ['coin', 'bar', 'round', 'jewelry'] as const;
export type ItemCategory = (typeof itemCategories)[number];

export interface CreateItemInput {
  metal: Metal;
  weight_unit: WeightUnit;
  weight: number;
  purity: number;
  quantity: number;
  item_type: ItemCategory | null;
  acquisition_date: string | null;
}

export interface Item extends CreateItemInput {
  id: string;
}

export type ItemType = {
  id: string;
  name: string;
  metal: Metal;
  weight: number;
  weight_unit: WeightUnit;
  purity: number;
};
