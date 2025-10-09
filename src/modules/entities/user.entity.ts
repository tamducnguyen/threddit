import {
  Column,
  Entity,
  Index,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { OAuthAccountEntity } from './oauth.entity';
import { CredentialEntity } from './credential.entity';
import { SessionEntity } from 'src/modules/entities/session.entity';
import { FollowEntity } from './follow.entity';
import { PostEntity } from './post.entity';
import { NotificationEntity } from './notification.entity';
import { VoteEntity } from './vote.entity';
import { SaveEntity } from './save.entity';

@Entity('users')
@Index(['username', 'id'])
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
  @OneToMany(() => FollowEntity, (follow) => follow.followee)
  followers: FollowEntity[];
  @OneToMany(() => FollowEntity, (follow) => follow.follower)
  following: FollowEntity[];
  @OneToMany(() => PostEntity, (post) => post.author)
  createdPost: PostEntity[];
  @OneToMany(() => NotificationEntity, (notification) => notification.owner)
  notifications: NotificationEntity[];
  @OneToMany(() => SaveEntity, (save) => save.saver)
  savedPost: PostEntity[];
  @OneToMany(() => VoteEntity, (vote) => vote.voter)
  votes: VoteEntity[];
}
