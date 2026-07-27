import { ConversationType } from 'src/enum/conversation-type.enum';
import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { MessageEntity } from './message.entity';
@Entity('conversations')
export class ConversationEntity {
  @PrimaryGeneratedColumn('increment')
  id: number;
  @Column({ name: 'type', type: 'enum', enum: ConversationType })
  type: ConversationType;
  @Column({ name: 'direct_key', type: 'varchar', unique: true, nullable: true })
  directKey: string;
  @Column({ name: 'name', type: 'text', nullable: true })
  name?: string;
  @OneToOne(() => MessageEntity)
  @JoinColumn({ name: 'last_message_id' })
  lastMessage: MessageEntity;
}
