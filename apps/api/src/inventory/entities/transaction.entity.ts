import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { Item } from './item.entity.js';

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @Column({ type: 'date' })
  effective_date: string;

  @ManyToOne(() => Item, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'item_id' })
  item: Item;

  @ManyToOne(() => Transaction, { nullable: true })
  @JoinColumn({ name: 'buy_id' })
  buy: Transaction | null;

  @Column()
  type: 'buy' | 'sell';

  @Column()
  quantity: number;

  @Column({ type: 'numeric', nullable: true })
  total_paid: string | null;
}
