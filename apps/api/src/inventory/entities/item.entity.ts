import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';

import { ItemType } from './item-type.entity.js';

@Entity('items')
export class Item {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @Column()
  quantity: number;

  @ManyToOne(() => ItemType, { nullable: false })
  item_type: ItemType;

  @Column({ type: 'date', nullable: true })
  acquisition_date: string | null;
}
