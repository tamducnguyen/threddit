import {
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ContentEntity } from './content.entity';
import { UserEntity } from './user.entity';

@Entity('saves')
@Index(['savedContent', 'saver'], { unique: true })
export class SaveEntity {
  @PrimaryGeneratedColumn('increment')
  id: number;
  @ManyToOne(() => ContentEntity, { onDelete: 'CASCADE' })
  savedContent: ContentEntity;
  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  saver: UserEntity;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
