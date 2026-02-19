import {
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
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
  @JoinColumn({ name: 'saved_content_id' })
  savedContent: ContentEntity;
  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'saver_user_id' })
  saver: UserEntity;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
