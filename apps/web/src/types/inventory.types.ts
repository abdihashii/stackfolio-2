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

export interface Transaction {
  id: string;
  created_at: string;
  effective_date: string;
  type: 'buy' | 'sell';
  quantity: number;
}
