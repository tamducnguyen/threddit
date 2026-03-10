import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ContentEntity } from './content.entity';
import { UserEntity } from './user.entity';

@Entity('comments')
@Index(['content', 'commenter'])
export class CommentEntity {
  @PrimaryGeneratedColumn('increment')
  id: number;
  @ManyToOne(() => ContentEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'content_id' })
  content: ContentEntity;
  @ManyToOne(() => UserEntity, (user) => user.createdComments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'commenter_user_id ' })
  commenter: UserEntity;
  @ManyToMany(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinTable({
    name: 'mentioned_user_comment',
    joinColumn: {
      name: 'comment_id',
    },
    inverseJoinColumn: { name: 'user_id' },
  })
  mentionedUsers: UserEntity[];
  @Column({ name: 'text', type: 'text', nullable: true })
  text?: string | null;
  @ManyToOne(() => CommentEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parent_comment_id' })
  parentComment: CommentEntity;
  @OneToMany(() => CommentEntity, (comment) => comment.parentComment)
  childComments: CommentEntity[];
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
