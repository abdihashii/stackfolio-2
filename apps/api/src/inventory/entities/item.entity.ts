import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';

import { ItemType } from './item-type.entity.js';

@Entity('items')
export class Item {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @Column()
  metal: 'gold' | 'silver';

  @Column({ type: 'double precision' })
  weight: number;

  @Column()
  weight_unit: 'gram' | 'ozt';

  @Column({ type: 'double precision' })
  purity: number;

  @Column()
  quantity: number;

  @ManyToOne(() => ItemType, { nullable: false })
  item_type: ItemType;

  @Column({ type: 'date', nullable: true })
  acquisition_date: string | null;
}
