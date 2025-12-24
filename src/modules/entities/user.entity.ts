import {
  Column,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { SessionEntity } from 'src/modules/entities/session.entity';
import { FollowEntity } from './follow.entity';
import { PostEntity } from './post.entity';
import { NotificationEntity } from './notification.entity';
import { VoteEntity } from './vote.entity';
import { SaveEntity } from './save.entity';
import { Gender } from '../enum/gender.enum';
import { AuthMethod } from '../enum/authmethod.enum';

@Entity('users')
@Index(['username', 'id'])
export class UserEntity {
  @PrimaryGeneratedColumn('increment', { name: 'id' })
  id: number;
  @Column({ type: 'varchar', unique: true, name: 'email' })
  email: string;
  @Column({ type: 'varchar', name: 'username', unique: true })
  username: string;
  @Column({ name: 'display_name', type: 'varchar' })
  displayName: string;
  @Column({ type: 'enum', enum: Gender, name: 'gender', nullable: true })
  gender: string;
  @Column({ type: 'date', name: 'date_of_birth', nullable: true })
  dateOfBirth: Date;
  @Column({
    name: 'avatar_relative_path',
    type: 'varchar',
    default: 'avatar/default_avatar.jpg',
  })
  avatarRelativePath: string;
  @Column({
    name: 'background_image_relative_path',
    type: 'varchar',
    default: 'background_image/default_background_image.png',
  })
  backgroundImageRelativePath: string;
  @Column({ name: 'auth_method', type: 'enum', enum: AuthMethod })
  authMethod: AuthMethod;
  @Column({ name: 'auth_method_key', type: 'varchar' })
  authMethodKey: string;
  @Column({ name: 'is_activate', type: 'boolean', default: false })
  isActivate: boolean;
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
