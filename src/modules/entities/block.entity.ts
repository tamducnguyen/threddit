import {
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserEntity } from './user.entity';

@Entity('blocks')
@Index(['blocker', 'blockedUser'], { unique: true })
export class BlockEntity {
  @PrimaryGeneratedColumn('increment')
  id: number;
  @ManyToOne(() => UserEntity, (user) => user.sentBlocks, {
    onDelete: 'CASCADE',
  })
  blocker: UserEntity;
  @ManyToOne(() => UserEntity, (user) => user.receivedBlocks, {
    onDelete: 'CASCADE',
  })
  blockedUser: UserEntity;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
