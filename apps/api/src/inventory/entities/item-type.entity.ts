import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity('item_types')
export class ItemType {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  metal: 'gold' | 'silver';

  @Column({ type: 'double precision' })
  weight: number;

  @Column()
  weight_unit: 'gram' | 'ozt';

  @Column({ type: 'double precision' })
  purity: number;
}
