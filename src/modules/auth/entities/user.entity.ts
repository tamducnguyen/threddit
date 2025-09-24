import {
  Column,
  Entity,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { OAuthAccountEntity } from './oauth.entity';
import { CredentialEntity } from './credential.entity';
import { SessionEntity } from 'src/modules/token/session.entity';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;
  @Column({ type: 'varchar', unique: true })
  email: string;
  @Column({ type: 'varchar', unique: true })
  username: string;
  @OneToOne(() => CredentialEntity, (credentialEntity) => credentialEntity.user)
  credential: CredentialEntity;
  @OneToOne(() => OAuthAccountEntity, (oAuthAccount) => oAuthAccount.user)
  oAuthAccounts: OAuthAccountEntity[];
  @OneToMany(() => SessionEntity, (session) => session.user)
  sessions: SessionEntity[];
}
