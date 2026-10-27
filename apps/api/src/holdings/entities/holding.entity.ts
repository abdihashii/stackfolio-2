import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Holding {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  metal: 'gold' | 'silver';

  @Column({type: "real"})
  weight: number;

  @Column()
  weight_unit: 'gram' | 'ozt';

  @Column({type: "real"})
  purity: number;

  @Column()
  quantity: number;

  @Column({type: "text", nullable: true})
  holding_type: string | null;
}
