import {
  Entity,
  ManyToOne,
  CreateDateColumn,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserEntity } from './user.entity';

@Entity('follows')
@Index(['follower', 'followee'], { unique: true })
@Index(['follower'])
@Index(['followee'])
export class FollowEntity {
  @PrimaryGeneratedColumn('increment')
  id: number;
  @ManyToOne(() => UserEntity, (user) => user.followings, {
    onDelete: 'CASCADE',
  })
  follower: UserEntity;
  @ManyToOne(() => UserEntity, (user) => user.followers, {
    onDelete: 'CASCADE',
  })
  followee: UserEntity;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
