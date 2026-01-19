import {
  Column,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { SessionEntity } from 'src/modules/entities/session.entity';
import { FollowEntity } from './follow.entity';
import { NotificationEntity } from './notification.entity';
import { Gender } from '../enum/gender.enum';
import { AuthMethod } from '../enum/authmethod.enum';
import { FriendshipEntity } from './friendship.entity';
import { ContentEntity } from './content.entity';
import { SaveEntity } from './save.entity';
import { CommentEntity } from './comment.entity';
import { BlockEntity } from './block.entity';
import { ReactionEntity } from './reaction.entity';
import { EducationalLevel } from '../enum/educationallevel.enum';
import { RelationshipStatus } from '../enum/relationshipstatus.enum';

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
  gender: Gender | null;
  @Column({ type: 'date', name: 'date_of_birth', nullable: true })
  dateOfBirth: Date | null;
  @Column({
    name: 'educational_level',
    type: 'enum',
    enum: EducationalLevel,
    nullable: true,
  })
  educationalLevel: EducationalLevel | null;
  @Column({
    name: 'relationship_status',
    type: 'enum',
    enum: RelationshipStatus,
    nullable: true,
  })
  relationshipStatus: RelationshipStatus | null;
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
  followings: FollowEntity[];
  @OneToMany(() => ContentEntity, (content) => content.author)
  createdContents: ContentEntity[];
  @OneToMany(() => NotificationEntity, (notification) => notification.owner)
  notifications: NotificationEntity[];
  @OneToMany(() => SaveEntity, (save) => save.saver)
  saves: SaveEntity[];
  @OneToMany(() => FriendshipEntity, (friendship) => friendship.requester)
  sentFriendships: FriendshipEntity[];
  @OneToMany(() => FriendshipEntity, (friendship) => friendship.recipient)
  receivedFriendship: FriendshipEntity[];
  @OneToMany(() => CommentEntity, (comment) => comment.commenter)
  createdComments: CommentEntity[];
  @OneToMany(() => BlockEntity, (block) => block.blocker)
  sentBlocks: BlockEntity[];
  @OneToMany(() => BlockEntity, (block) => block.blockedUser)
  receivedBlocks: BlockEntity[];
  @OneToMany(() => ReactionEntity, (reaction) => reaction.reacter)
  createdReactions: ReactionEntity[];
}
