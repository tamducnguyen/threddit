import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';
import { ConversationMemberRole } from 'src/enum/conversation-member-role.enum';

/**
 * Join row linking a user to a conversation. Composite primary key on
 * (member_user_id, conversation_id); the column names match the raw SQL used
 * throughout ConversationRepository.
 */
@Entity('conversation_members')
export class ConversationMemberEntity {
  @PrimaryColumn({ name: 'member_user_id', type: 'int' })
  userId: number;

  @PrimaryColumn({ name: 'conversation_id', type: 'int' })
  conversationId: number;

  @Column({ name: 'role', type: 'enum', enum: ConversationMemberRole })
  role: ConversationMemberRole;

  /** Whether this member has pinned the conversation in their own inbox. */
  @Column({ name: 'is_pinned', type: 'boolean', default: false })
  isPinned: boolean;

  /** The id of the last message this member has read; null = never read. */
  @Column({ name: 'last_read_message_id', type: 'int', nullable: true })
  lastReadMessageId: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
