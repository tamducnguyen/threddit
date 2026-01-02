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
import { ReactionType } from '../enum/reactiontype.enum';
import { ReactionTargetType } from '../enum/reactiontargettype.enum';

@Entity('reactions')
@Index(['targetId', 'reactionTargetType', 'reacter'], { unique: true })
export class ReactionEntity {
  @PrimaryGeneratedColumn('increment')
  id: number;
  @Column({ name: 'target_type', type: 'enum', enum: ReactionTargetType })
  reactionTargetType: ReactionTargetType;
  @Column({ name: 'target_id', type: 'int' })
  targetId: number;
  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  reacter: UserEntity;
  @Column({ name: 'type', type: 'enum', enum: ReactionType })
  type: ReactionType;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
