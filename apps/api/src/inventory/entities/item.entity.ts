import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, OneToOne, JoinColumn } from 'typeorm';

import { ItemType } from './item-type.entity.js';

@Entity('items')
export class Item {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @OneToOne(() => ItemType, { nullable: false })
  @JoinColumn({ name: 'item_type_id' })
  item_type: ItemType;

  @Column({ type: 'date', nullable: true })
  acquisition_date: string | null;
}
