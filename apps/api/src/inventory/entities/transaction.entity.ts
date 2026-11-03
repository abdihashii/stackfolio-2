import { PrimaryGeneratedColumn, Entity, ManyToOne } from 'typeorm';

import { Item } from './item.entity.js';

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Item, { nullable: false })
  item: Item;
}
