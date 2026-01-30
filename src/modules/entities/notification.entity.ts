import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserEntity } from './user.entity';
import { NotificationType } from '../enum/notificationtype.enum';
import { NotificationTarget } from '../enum/notificationtarget.type';

@Entity('notifications')
@Index(['owner', 'isRead'])
export class NotificationEntity {
  @PrimaryGeneratedColumn('increment')
  id: number;
  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  owner: UserEntity;
  @Column({ name: 'is_read', type: 'boolean', default: false })
  isRead: boolean;
  @Column({ name: 'message', type: 'text' })
  message: string;
  @Column({ name: 'type', type: 'enum', enum: NotificationType })
  type: NotificationType;
  @Column({ name: 'target', type: 'jsonb' })
  target: NotificationTarget;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
