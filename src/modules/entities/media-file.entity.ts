import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { MediaTargetType } from '../enum/media-target-type.enum';
import { MediaType } from '../enum/media-type.enum';

@Entity('media_files')
@Index(['targetType', 'targetId'])
@Index(['targetId', 'targetType', 'sortOrder'], { unique: true })
export class MediaFileEntity {
  @PrimaryGeneratedColumn('increment')
  id: number;
  @Column({ name: 'target_type', type: 'enum', enum: MediaTargetType })
  targetType: MediaTargetType;
  @Column({ name: 'target_id', type: 'bigint' })
  targetId: number;
  @Column({ name: 'type', type: 'enum', enum: MediaType })
  type: MediaType;
  @Column({ name: 'relative_path', type: 'varchar', unique: true })
  relativePath: string;
  @Column({ name: 'sort_order', type: 'int' })
  sortOrder: number;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
