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
import { ContentEntity } from './content.entity';
import { UserEntity } from './user.entity';

@Entity('comments')
@Index(['content', 'commenter'])
export class CommentEntity {
  @PrimaryGeneratedColumn('increment')
  id: number;
  @ManyToOne(() => ContentEntity, { onDelete: 'CASCADE' })
  content: ContentEntity;
  @ManyToOne(() => UserEntity, (user) => user.createdComments, {
    onDelete: 'CASCADE',
  })
  commenter: UserEntity;
  @ManyToMany(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinTable({ name: 'mentioned_user_comment' })
  mentionedUser: UserEntity[];
  @Column({ name: 'text', type: 'text', nullable: true })
  text: string;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
