import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from './user.entity';

@Entity('credentials')
export class CredentialEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  @OneToOne(() => UserEntity, (user) => user.credential, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;
  @Column({ name: 'password_hash', type: 'varchar' })
  hashedPassword: string;
  @UpdateDateColumn()
  updatedAt: Date;
}
