import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { MessageEntity } from './message.entity';
import { UserEntity } from './user.entity';

/**
 * Join row recording that a user was @mentioned in a message. Persisted (not
 * just resolved at send time) so history pages can re-render the mention
 * highlight when scrolling back, not only at the moment the message is sent.
 */
@Entity('message_mentions')
export class MessageMentionEntity {
  @PrimaryColumn({ name: 'message_id', type: 'int' })
  messageId: number;

  @PrimaryColumn({ name: 'user_id', type: 'int' })
  userId: number;

  @ManyToOne(() => MessageEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'message_id' })
  message: MessageEntity;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;
}
