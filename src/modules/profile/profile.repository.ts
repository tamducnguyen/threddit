import { InjectRepository } from '@nestjs/typeorm';
import { UserEntity } from '../entities/user.entity';
import { Brackets, DataSource, Repository } from 'typeorm';
import { BlockEntity } from '../entities/block.entity';
import { FriendshipEntity } from '../entities/friendship.entity';
import { FriendshipStatus } from '../enum/friendshipstatus.enum';
import { ConfigService } from '@nestjs/config';
import { ProfileCursor } from './interfaces/profile-cursor.interface';
import { Profile } from './interfaces/profile.interface';

export class ProfileRepository {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(BlockEntity)
    private readonly blockRepo: Repository<BlockEntity>,
    @InjectRepository(FriendshipEntity)
    private readonly friendshipRepo: Repository<FriendshipEntity>,
    private readonly datasource: DataSource,
    private readonly configService: ConfigService,
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
    const storageUrl = this.configService.getOrThrow<string>('STORAGE_URL');
    const getOtherProfileByUserIdQuery = `
      SELECT
        u.email as "email",
        u.username as "username",
        u.display_name as "displayName",
        u.date_of_birth as "dateOfBirth",
        u.gender as "gender",
        u.educational_level as "educationalLevel",
        u.relationship_status as "relationshipStatus",
        concat($1::text, u.avatar_relative_path) as "avatarUrl",
        concat($1::text, u.background_image_relative_path) as "backgroundImageUrl",
        (
          SELECT COUNT(*)
          FROM follows f
          WHERE f."followeeId" = u.id
        )::int as "followerNumber",
        (
          SELECT COUNT(*)
          FROM follows f
          WHERE f."followerId" = u.id
        )::int as "followingNumber",
        (
          SELECT COUNT(*)
          FROM friendships fr
          WHERE (fr."requesterId" = u.id OR fr."recipientId" = u.id)
          AND fr.status = $2
        )::int as "friendNumber",
        EXISTS (
          SELECT 1
          FROM follows f
          WHERE f."followerId" = $3
          AND f."followeeId" = u.id
        ) as "isFollowing",
        (
          SELECT 
            CASE 
              WHEN fr.status = $2 THEN $2::text
              WHEN (fr."requesterId" = u.id AND fr."recipientId" = $3 AND fr.status = $4) THEN 'pending_received'
              WHEN (fr."requesterId" = $3 AND fr."recipientId" = u.id AND fr.status = $4) THEN 'pending_sent'
              ELSE NULL
            END
          FROM friendships fr
          WHERE ((fr."requesterId" = u.id AND fr."recipientId" = $3)
          OR (fr."requesterId" = $3 AND fr."recipientId" = u.id))
        ) as "friendshipStatus",
        (
          SELECT COUNT(*)
          FROM (
            SELECT 
              CASE
                WHEN fr."requesterId" = u.id THEN fr."recipientId"
                ELSE fr."requesterId"
              END
            FROM friendships fr
            WHERE ((fr."requesterId" = u.id AND  fr."recipientId" != $3)
            OR (fr."recipientId" = u.id AND  fr."requesterId" != $3))
            AND fr.status = $2

            INTERSECT

            SELECT 
              CASE
                WHEN fr."requesterId" = $3 THEN fr."recipientId"
                ELSE fr."requesterId"
              END
            FROM friendships fr
            WHERE ((fr."requesterId" = $3 AND  fr."recipientId" != u.id)
            OR (fr."recipientId" = $3 AND  fr."requesterId" != u.id))
            AND fr.status = $2
          ) mutual_friend_ids
        )::int as "mutualFriendNumber"
      FROM users u
      WHERE u.id = $5
      LIMIT 1
    `;
    const params = [
      storageUrl,
      FriendshipStatus.ACCEPTED,
      currentUserId,
      FriendshipStatus.PENDING,
      userId,
    ];
    const [profile] = await this.userRepo.query<Profile[]>(
      getOtherProfileByUserIdQuery,
      params,
    );
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

  async searchProfiles(
    currentUserId: number,
    key: string,
    cursor?: ProfileCursor,
  ) {
    const limit = this.configService.getOrThrow<number>('LIMIT_USER_ITEM');
    const storageUrl = this.configService.getOrThrow<string>('STORAGE_URL');
    let searchProfilesQuery = `
      SELECT
        u.email as "email",
        u.username as "username",
        u.display_name as "displayName",
        u.date_of_birth as "dateOfBirth",
        u.gender as "gender",
        u.educational_level as "educationalLevel",
        u.relationship_status as "relationshipStatus",
        concat($1::text, u.avatar_relative_path) as "avatarUrl",
        concat($1::text, u.background_image_relative_path) as "backgroundImageUrl",
        fln.follower_number::int as "followerNumber",
        (
          SELECT COUNT(*)
          FROM follows f
          WHERE f."followerId" = u.id
        )::int as "followingNumber",
        (
          SELECT COUNT(*)
          FROM friendships fr
          WHERE (fr."requesterId" = u.id OR fr."recipientId" = u.id)
          AND fr.status = $2
        )::int as "friendNumber",
        EXISTS (
          SELECT 1
          FROM follows f
          WHERE f."followerId" = $3
          AND f."followeeId" = u.id
        ) as "isFollowing",
        (
          SELECT 
            CASE 
              WHEN fr.status = $2 THEN $2::text
              WHEN (fr."requesterId" = u.id AND fr."recipientId" = $3 AND fr.status = $4) THEN 'pending_received'
              WHEN (fr."requesterId" = $3 AND fr."recipientId" = u.id AND fr.status = $4) THEN 'pending_sent'
              ELSE NULL
            END
          FROM friendships fr
          WHERE ((fr."requesterId" = u.id AND fr."recipientId" = $3)
          OR (fr."requesterId" = $3 AND fr."recipientId" = u.id))
        ) as "friendshipStatus",
        (
          SELECT COUNT(*)
          FROM (
            SELECT 
              CASE
                WHEN fr."requesterId" = u.id THEN fr."recipientId"
                ELSE fr."requesterId"
              END
            FROM friendships fr
            WHERE ((fr."requesterId" = u.id AND  fr."recipientId" != $3)
            OR (fr."recipientId" = u.id AND  fr."requesterId" != $3))
            AND fr.status = $2

            INTERSECT

            SELECT 
              CASE
                WHEN fr."requesterId" = $3 THEN fr."recipientId"
                ELSE fr."requesterId"
              END
            FROM friendships fr
            WHERE ((fr."requesterId" = $3 AND  fr."recipientId" != u.id)
            OR (fr."recipientId" = $3 AND  fr."requesterId" != u.id))
            AND fr.status = $2
          ) mutual_friend_ids
        )::int as "mutualFriendNumber"
      FROM users u
      LEFT JOIN LATERAL(
        SELECT COUNT(*) as follower_number
        FROM follows f
        WHERE f."followeeId" = u.id
      ) fln ON TRUE
      WHERE (u.username ILIKE $5
      OR u.display_name ILIKE $5)
      AND NOT EXISTS (
        SELECT 1
        FROM blocks bl
        WHERE bl."blockerId" = $3
        AND bl."blockedUserId" = u.id
      )
      AND NOT EXISTS (
        SELECT 1
        FROM blocks bl
        WHERE bl."blockerId" = u.id
        AND bl."blockedUserId" = $3
      )
    `;
    const params = [
      storageUrl,
      FriendshipStatus.ACCEPTED,
      currentUserId,
      FriendshipStatus.PENDING,
      `%${key}%`,
      limit,
    ];
    if (cursor) {
      params.push(cursor.followerNumber, cursor.username);
      searchProfilesQuery += `AND (fln.follower_number::int < $7 OR (fln.follower_number::int = $7 AND u.username < $8))`;
    }
    searchProfilesQuery += `
      ORDER BY fln.follower_number::int DESC,
      u.username DESC
      LIMIT $6
    `;
    const searchedProfiles = await this.userRepo.query<Profile[]>(
      searchProfilesQuery,
      params,
    );
    return searchedProfiles;
  }
}
