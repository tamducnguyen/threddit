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
import { UserEntity } from './user.entity';
import { CommentEntity } from './comment.entity';
import { SaveEntity } from './save.entity';
import { ContentType } from '../enum/contenttype.enum';
@Entity('contents')
@Index(['author', 'text'])
export class ContentEntity {
  @PrimaryGeneratedColumn('increment')
  id: number;
  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'author_user_id' })
  author: UserEntity;
  @Column({ name: 'text', type: 'text', nullable: true })
  text: string;
  @Column({ name: 'type', type: 'enum', enum: ContentType })
  type: ContentType;
  @Column({ name: 'is_pinned', type: 'bool', default: false })
  isPinned: boolean;
  @ManyToMany(() => UserEntity, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinTable({
    name: 'mentioned_user_content',
    joinColumn: { name: 'content_id' },
    inverseJoinColumn: { name: 'user_id' },
  })
  mentionedUser: UserEntity[];
  @OneToMany(() => CommentEntity, (comment) => comment.content)
  comments: CommentEntity[];
  @OneToMany(() => SaveEntity, (save) => save.savedContent)
  saves: SaveEntity[];
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
