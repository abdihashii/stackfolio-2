import type { DataSourceOptions } from 'typeorm';

import { ItemType } from './inventory/entities/item-type.entity.js';
import { Item } from './inventory/entities/item.entity.js';
import { Transaction } from './inventory/entities/transaction.entity.js';

export const databaseOptions: DataSourceOptions = {
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'stackfolio_user',
  password: 'stackfolio_password',
  database: 'stackfolio_db',
  entities: [Item, ItemType, Transaction],
  synchronize: false,
};
