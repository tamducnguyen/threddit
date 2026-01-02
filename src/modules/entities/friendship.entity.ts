import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from './user.entity';
import { FriendshipStatus } from '../enum/friendshipstatus.enum';

@Entity('friendship')
@Index(['requester', 'recipient'], { unique: true })
export class FriendshipEntity {
  @PrimaryGeneratedColumn('increment')
  id: number;
  @ManyToOne(() => UserEntity, (user) => user.sentFriendships, {
    onDelete: 'CASCADE',
  })
  requester: UserEntity;
  @ManyToOne(() => UserEntity, (user) => user.receivedFriendship, {
    onDelete: 'CASCADE',
  })
  recipient: UserEntity;
  @Column({ name: 'status', type: 'enum', enum: FriendshipStatus })
  status: FriendshipStatus;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
