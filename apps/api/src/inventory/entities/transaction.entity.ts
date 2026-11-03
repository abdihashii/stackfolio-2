import { PrimaryGeneratedColumn, Entity, ManyToOne, Column } from 'typeorm';

import { Item } from './item.entity.js';

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Item, { nullable: false })
  item: Item;

  @Column()
  type: 'buy' | 'sell';

  @Column()
  quantity: number;
}
