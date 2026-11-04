import type { ItemType } from './entities/item-type.entity.js';

export const itemTypePresets: Omit<ItemType, 'id'>[] = [
  {
    name: 'American Silver Eagle, 1 oz',
    metal: 'silver',
    weight: 1,
    weight_unit: 'ozt',
    purity: 0.999,
  },
  {
    name: 'Canadian Silver Maple Leaf, 1 oz',
    metal: 'silver',
    weight: 1,
    weight_unit: 'ozt',
    purity: 0.9999,
  },
  {
    name: 'Generic silver round, 1 oz, .999',
    metal: 'silver',
    weight: 1,
    weight_unit: 'ozt',
    purity: 0.999,
  },
  {
    name: 'Generic silver bar, 1 oz, .999',
    metal: 'silver',
    weight: 1,
    weight_unit: 'ozt',
    purity: 0.999,
  },
  {
    name: 'Generic silver bar, 10 oz, .999',
    metal: 'silver',
    weight: 10,
    weight_unit: 'ozt',
    purity: 0.999,
  },
  {
    name: 'American Gold Eagle, 1 oz',
    metal: 'gold',
    weight: 1,
    weight_unit: 'ozt',
    purity: 0.9167,
  },
  {
    name: 'American Gold Buffalo, 1 oz',
    metal: 'gold',
    weight: 1,
    weight_unit: 'ozt',
    purity: 0.9999,
  },
  {
    name: 'Canadian Gold Maple Leaf, 1 oz, .9999',
    metal: 'gold',
    weight: 1,
    weight_unit: 'ozt',
    purity: 0.9999,
  },
  {
    name: 'Generic gold bar, 1 oz, .9999',
    metal: 'gold',
    weight: 1,
    weight_unit: 'ozt',
    purity: 0.9999,
  },
];
