import {
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PostEntity } from './post.entity';
import { UserEntity } from './user.entity';

@Entity('saves')
@Index(['savedPost', 'saver'], { unique: true })
export class SaveEntity {
  @PrimaryGeneratedColumn('increment')
  id: number;
  @ManyToOne(() => PostEntity, { onDelete: 'CASCADE' })
  savedPost: PostEntity;
  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  saver: UserEntity;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
