import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinTable,
  ManyToMany,
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
  @ManyToMany(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinTable({ name: 'mentioned_user_comment' })
  mentionedUser: UserEntity[];
  @Column({ name: 'content', type: 'text' })
  content: string;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
