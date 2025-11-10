import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserEntity } from './user.entity';
import { NotificationType } from '../enum/notificationtype.enum';

@Entity('notifications')
@Index(['owner', 'isRead'])
export class NotificationEntity {
  @PrimaryGeneratedColumn('increment')
  id: number;
  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  owner: UserEntity;
  @Column({ name: 'is_read', type: 'boolean', default: false })
  isRead: boolean;
  @Column({ name: 'content', type: 'text' })
  content: string;
  @Column({ name: 'type', type: 'enum', enum: NotificationType })
  type: string;
  @Column({ name: 'target', type: 'jsonb' })
  target: any;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
