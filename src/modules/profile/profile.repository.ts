import { InjectRepository } from '@nestjs/typeorm';
import { UserEntity } from '../entities/user.entity';
import { Brackets, DataSource, Repository } from 'typeorm';
import { BlockEntity } from '../entities/block.entity';
import { FriendshipEntity } from '../entities/friendship.entity';
import { FriendshipStatus } from '../enum/friendshipstatus.enum';
import { FollowEntity } from '../entities/follow.entity';

export class ProfileRepository {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(BlockEntity)
    private readonly blockRepo: Repository<BlockEntity>,
    @InjectRepository(FriendshipEntity)
    private readonly friendshipRepo: Repository<FriendshipEntity>,
    private readonly datasource: DataSource,
  ) {}
  async getProfileByUserId(userId: number) {
    type Profile = UserEntity & {
      followerNumber: number;
      followingNumber: number;
      friendNumber: number;
    };
    const qb = this.userRepo
      .createQueryBuilder('user')
      .where('user.id = :userId', { userId })
      .loadRelationCountAndMap('user.followerNumber', 'user.followers')
      .loadRelationCountAndMap('user.followingNumber', 'user.followings')
      .addSelect(
        (subQuery) =>
          subQuery
            .select('COUNT(*)')
            .from(FriendshipEntity, 'friendship')
            .where('friendship.status = :status', {
              status: FriendshipStatus.ACCEPTED,
            })
            .andWhere(
              new Brackets((qb) => {
                qb.where('friendship.requesterId = :userId', {
                  userId,
                }).orWhere('friendship.recipientId = :userId', { userId });
              }),
            ),
        'friendNumber',
      );
    const { entities, raw } = await qb.getRawAndEntities();
    type ProfileRaw = { friendNumber: number };
    const profileRaw = raw[0] as ProfileRaw;
    const profile = entities[0] as Profile | undefined;
    if (profile) {
      profile.friendNumber = Number(profileRaw.friendNumber);
    }
    return profile;
  }
  async findUserByUsername(username: string) {
    return await this.userRepo.findOne({
      where: { username: username },
    });
  }
  async getOtherProfileByUserId(currentUserId: number, userId: number) {
    type Profile = UserEntity & {
      followerNumber: number;
      followingNumber: number;
      friendNumber: number;
      friendshipStatus: 'pending_sent' | 'pending_received' | 'accepted' | null;
      isFollowing: boolean;
      mutualFriendNumber: number;
    };
    const getUserFriendQuery = this.friendshipRepo
      .createQueryBuilder('friendship')
      .select(
        `CASE WHEN friendship.requesterId = :userId THEN friendship.recipientId ELSE friendship.requesterId END`,
      )
      .where('friendship.status = :accepted')
      .andWhere(
        new Brackets((inner) => {
          inner
            .where('friendship.requesterId = :userId')
            .orWhere('friendship.recipientId = :userId');
        }),
      )
      .getQuery();
    const qb = this.userRepo
      .createQueryBuilder('user')
      .where('user.id = :userId')
      .loadRelationCountAndMap('user.followerNumber', 'user.followers')
      .loadRelationCountAndMap('user.followingNumber', 'user.followings')

      // friendNumber
      .addSelect(
        (subQ) =>
          subQ
            .select('COUNT(*)')
            .from(FriendshipEntity, 'friendship')
            .where('friendship.status = :accepted')
            .andWhere(
              new Brackets((q) =>
                q
                  .where('friendship.requesterId = :userId')
                  .orWhere('friendship.recipientId = :userId'),
              ),
            ),
        'friendNumber',
      )

      // friendshipStatus
      .addSelect(
        (subQ) =>
          subQ
            .select(
              `
          CASE
            WHEN friendship.status = :pending AND friendship.requesterId = :currentUserId THEN 'pending_sent'
            WHEN friendship.status = :pending AND friendship.requesterId = :userId THEN 'pending_received'
            WHEN friendship.status = :accepted THEN 'accepted'
          END
        `,
            )
            .from(FriendshipEntity, 'friendship')
            .where(
              new Brackets((q) =>
                q
                  .where(
                    'friendship.requesterId = :currentUserId AND friendship.recipientId = :userId',
                  )
                  .orWhere(
                    'friendship.requesterId = :userId AND friendship.recipientId = :currentUserId',
                  ),
              ),
            )
            .limit(1),
        'friendshipStatus',
      )
      // followStatus
      .addSelect(
        (subQ) =>
          subQ
            .select(
              `
              CASE
              WHEN COUNT(*) > 0 THEN TRUE
              ELSE FALSE
              END
            `,
            )
            .from(FollowEntity, 'f')
            .where('f.followerId = :currentUserId')
            .andWhere('f.followeeId = :userId'),
        'isFollowing',
      )
      //count mutual friend
      .addSelect(
        (subQ) =>
          subQ
            .from(FriendshipEntity, 'friendship')
            .select('COUNT(*)')
            .where('friendship.status = :accepted')
            .andWhere(
              new Brackets((qb) =>
                qb
                  .where('friendship.requesterId = :currentUserId ')
                  .orWhere('friendship.recipientId = :currentUserId'),
              ),
            )
            .andWhere(
              `CASE WHEN friendship.requesterId = :currentUserId THEN friendship.recipientId ELSE friendship.requesterId END IN (${getUserFriendQuery})`,
            )
            .andWhere(
              `CASE WHEN friendship.requesterId = :currentUserId THEN friendship.recipientId ELSE friendship.requesterId END NOT IN (:...excludedIds)`,
            ),
        'mutualFriendNumber',
      )
      .setParameters({
        currentUserId: currentUserId,
        userId: userId,
        excludedIds: [currentUserId, userId],
        pending: FriendshipStatus.PENDING,
        accepted: FriendshipStatus.ACCEPTED,
      });
    const { entities, raw } = await qb.getRawAndEntities();

    type ProfileRaw = {
      friendNumber: number;
      friendshipStatus: 'pending_sent' | 'pending_received' | 'accepted' | null;
      isFollowing: boolean;
      mutualFriendNumber: number;
    };

    const profileEntity = entities[0] as Profile | undefined;
    const profileRaw = raw[0] as ProfileRaw | undefined;

    if (!profileEntity || !profileRaw) return undefined;

    const profile: Profile = {
      ...profileEntity,
      friendNumber: Number(profileRaw.friendNumber),
      friendshipStatus: profileRaw.friendshipStatus,
      isFollowing: profileRaw.isFollowing,
      mutualFriendNumber: Number(profileRaw.mutualFriendNumber),
    };

    return profile;
  }

  async checkUsernameExist(username: string) {
    return await this.userRepo.exists({ where: { username: username } });
  }
  async updateAndGetProfile(userId: number, updateInfo: Partial<UserEntity>) {
    return await this.datasource.transaction(async (manager) => {
      const userRepo = manager.getRepository(UserEntity);
      const updateResult = await userRepo.update(userId, updateInfo);
      const updatedProfile = await userRepo.findOne({ where: { id: userId } });
      return { updateResult, updatedProfile };
    });
  }
  async checkBlocked(blockedId: number, blockerId: number) {
    return await this.blockRepo.exists({
      where: {
        blockedUser: { id: blockedId },
        blocker: { id: blockerId },
      },
    });
  }
}
