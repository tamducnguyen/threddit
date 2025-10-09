import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PostEntity } from './post.entity';
import { UserEntity } from './user.entity';

@Entity('comments')
@Index(['post', 'id', 'commenter'])
export class CommentEntity {
  @PrimaryGeneratedColumn('increment')
  id: number;
  @ManyToOne(() => PostEntity, { onDelete: 'CASCADE' })
  post: PostEntity;
  @ManyToOne(() => UserEntity)
  commenter: UserEntity;
  @Column({ name: 'content', type: 'text' })
  content: string;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
