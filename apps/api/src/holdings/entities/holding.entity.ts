import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('holdings')
export class Holding {
  @PrimaryGeneratedColumn('uuid')
  id: string;

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
  holding_type: string | null;

  @Column({ type: 'date', nullable: true })
  acquisition_date: string | null;
}
