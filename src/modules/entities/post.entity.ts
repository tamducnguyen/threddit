import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from './user.entity';
import { CommentEntity } from './comment.entity';
import { VoteEntity } from './vote.entity';
import { SaveEntity } from './save.entity';
@Entity('posts')
@Index(['author', 'id', 'content'])
export class PostEntity {
  @PrimaryGeneratedColumn('increment')
  id: number;
  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  author: UserEntity;
  @Column({ name: 'content', type: 'text' })
  content: string;
  @Column({ name: 'is_pinned', type: 'bool', default: false })
  isPinned: boolean;
  @OneToMany(() => VoteEntity, (vote) => vote.post)
  votes: VoteEntity;
  @ManyToMany(() => UserEntity)
  @JoinTable({ name: 'mentioned_user' })
  mentionedUser: UserEntity[];
  @OneToMany(() => CommentEntity, (comment) => comment.post)
  comments: CommentEntity[];
  @OneToMany(() => SaveEntity, (save) => save.savedPost)
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
