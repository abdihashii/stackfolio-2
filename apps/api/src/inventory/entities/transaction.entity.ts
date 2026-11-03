import { PrimaryGeneratedColumn, Entity, ManyToOne, Column, CreateDateColumn } from 'typeorm';

import { Item } from './item.entity.js';

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @Column({ type: 'date' })
  effective_date: string;

  @ManyToOne(() => Item, { nullable: false })
  item: Item;

  @Column()
  type: 'buy' | 'sell';

  @Column()
  quantity: number;
}
