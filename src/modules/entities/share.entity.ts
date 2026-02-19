import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { UserEntity } from './user.entity';
import { ContentEntity } from './content.entity';

@Entity('shares')
@Index(['sharer', 'sharedContent'], { unique: true })
export class ShareEntity {
  @PrimaryGeneratedColumn('increment')
  id: number;
  @Column({ name: 'message', type: 'varchar', nullable: true, length: 500 })
  message: string | null;
  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sharer_user_id' })
  sharer: UserEntity;
  @ManyToOne(() => ContentEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shared_content_id' })
  sharedContent: ContentEntity;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
