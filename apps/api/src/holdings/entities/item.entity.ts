import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

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

  @Column({ type: 'text', nullable: true })
  item_type: string | null;

  @Column({ type: 'date', nullable: true })
  acquisition_date: string | null;
}
