import {
  Column,
  Entity,
  JoinColumn,
  PrimaryGeneratedColumn,
  Index,
  OneToOne,
} from 'typeorm';
import { ProviderOauth } from '../enum/provideroauth.enum';
import { UserEntity } from './user.entity';
@Entity({ name: 'oauth_accounts' })
@Index(['provider', 'providerAccountId'], { unique: true })
@Index(['user', 'provider'], { unique: true })
export class OAuthAccountEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  @OneToOne(() => UserEntity, (u) => u.oAuthAccounts, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;
  @Column({ nullable: false, type: 'enum', enum: ProviderOauth })
  provider: ProviderOauth;
  @Column({ nullable: false })
  providerAccountId: string;
}
