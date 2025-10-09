import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PostEntity } from './post.entity';
import { UserEntity } from './user.entity';

@Entity('votes')
@Index(['post', 'voter'], { unique: true })
export class VoteEntity {
  @PrimaryGeneratedColumn('increment')
  id: number;
  @ManyToOne(() => PostEntity, { onDelete: 'CASCADE' })
  post: PostEntity;
  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  voter: UserEntity;
  @Column({ name: 'is_upvote', type: 'boolean' })
  isUpvote: boolean;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
