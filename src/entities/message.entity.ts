import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserEntity } from './user.entity';
import { ConversationEntity } from './conversation.entity';

@Entity('messages')
export class MessageEntity {
  @PrimaryGeneratedColumn('increment')
  id: number;
  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'sender_user_id' })
  sender: UserEntity;
  @ManyToOne(() => ConversationEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'conversation_id' })
  conversation: ConversationEntity;
  @ManyToOne(() => MessageEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reply_to_message_id' })
  replyTo: MessageEntity | null;
  @Column({ name: 'text', type: 'text', nullable: true })
  text: string | null;
  @Column({ name: 'is_revoked', type: 'bool', default: false })
  isRevoked: boolean;
  /** Set only by the edit path; null means never edited. Kept separate from
   * `createdAt`/revoke so "was this message edited" stays unambiguous. */
  @Column({ name: 'edited_at', type: 'timestamptz', nullable: true })
  editedAt: Date | null;
  /** Global pin flag (not per-user) — a message pinned by any admin/member. */
  @Column({ name: 'is_pinned', type: 'bool', default: false })
  isPinned: boolean;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
