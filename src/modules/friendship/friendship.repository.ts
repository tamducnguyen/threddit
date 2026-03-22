import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { FriendshipEntity } from '../entities/friendship.entity';
import { UserEntity } from '../entities/user.entity';
import { BlockEntity } from '../entities/block.entity';
import { FriendshipStatus } from '../enum/friendshipstatus.enum';
import { Cursor } from '../interface/cursor.interface';
import { ConfigService } from '@nestjs/config';
import { Friend } from './interfaces/friend.interface';

export class FriendshipRepository {
  constructor(
    @InjectRepository(FriendshipEntity)
    private readonly friendshipRepo: Repository<FriendshipEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(BlockEntity)
    private readonly blockRepo: Repository<BlockEntity>,
    private readonly configService: ConfigService,
  ) {}

  async findUserByUsername(username: string) {
    return await this.userRepo.findOne({ where: { username: username } });
  }
  async findUserById(id: number) {
    return await this.userRepo.findOne({ where: { id: id } });
  }

  async findFriendship(requesterId: number, recipientId: number) {
    return await this.friendshipRepo.findOne({
      where: {
        requester: { id: requesterId },
        recipient: { id: recipientId },
      },
    });
  }

  async findFriendRequest(requesterUserId: number, recipientUserId: number) {
    return await this.friendshipRepo.findOne({
      where: {
        requester: { id: requesterUserId },
        recipient: { id: recipientUserId },
        status: FriendshipStatus.PENDING,
      },
      relations: { requester: true, recipient: true },
    });
  }

  async findFriendshipBetween(userAId: number, userBId: number) {
    return await this.friendshipRepo.findOne({
      where: [
        { requester: { id: userAId }, recipient: { id: userBId } },
        { requester: { id: userBId }, recipient: { id: userAId } },
      ],
      relations: { requester: true, recipient: true },
    });
  }

  async deleteFriendshipById(friendshipId: number) {
    return await this.friendshipRepo.delete({ id: friendshipId });
  }

  async checkBlocked(blockedId: number, blockerId: number) {
    return await this.blockRepo.exists({
      where: {
        blockedUser: { id: blockedId },
        blocker: { id: blockerId },
      },
    });
  }

  async createFriendRequest(friendship: Partial<FriendshipEntity>) {
    return await this.friendshipRepo.save(friendship);
  }

  async acceptFriendRequest(friendshipId: number) {
    return await this.friendshipRepo.update(
      { id: friendshipId },
      { status: FriendshipStatus.ACCEPTED },
    );
  }

  async findReceivedFriendRequests(
    recipientId: number,
    cursor?: Cursor,
    key?: string,
  ) {
    const qb = this.friendshipRepo
      .createQueryBuilder('friendship')
      .leftJoinAndSelect('friendship.requester', 'requester')
      .where('friendship.status = :status', {
        status: FriendshipStatus.PENDING,
      })
      .andWhere('friendship.recipientId = :recipientId', { recipientId })

      .orderBy('friendship.id', 'DESC')
      .take(this.configService.getOrThrow<number>('LIMIT_FRIEND_REQUEST_ITEM'));
    if (key) {
      qb.andWhere(
        new Brackets((qbInner) => {
          qbInner
            .where('requester.username ILIKE :key', { key: `%${key}%` })
            .orWhere('requester.displayName ILIKE :key', {
              key: `%${key}%`,
            });
        }),
      );
    }
    if (cursor?.id) {
      qb.andWhere('friendship.id < :id', { id: cursor.id });
    }
    return await qb.getMany();
  }

  async findSentFriendRequests(
    requesterId: number,
    cursor?: Cursor,
    key?: string,
  ) {
    const qb = this.friendshipRepo
      .createQueryBuilder('friendship')
      .leftJoinAndSelect('friendship.recipient', 'recipient')
      .where('friendship.status = :status', {
        status: FriendshipStatus.PENDING,
      })
      .andWhere('friendship.requesterId = :requesterId', { requesterId })
      .orderBy('friendship.id', 'DESC')
      .take(this.configService.getOrThrow<number>('LIMIT_FRIEND_REQUEST_ITEM'));
    if (key) {
      qb.andWhere(
        new Brackets((qbInner) => {
          qbInner
            .where('recipient.username ILIKE :key', { key: `%${key}%` })
            .orWhere('recipient.displayName ILIKE :key', {
              key: `%${key}%`,
            });
        }),
      );
    }
    if (cursor?.id) {
      qb.andWhere('friendship.id < :id', { id: cursor.id });
    }
    return await qb.getMany();
  }

  async findFriends(
    targetUserId: number,
    currentUserId: number,
    cursor?: number,
    key?: string,
  ) {
    const limit = this.configService.getOrThrow<number>('LIMIT_FRIEND_ITEM');
    const storageUrl = this.configService.getOrThrow<string>('STORAGE_URL');
    let getFriendsQuery = `
      SELECT 
        friend_ids_and_friendship_ids.id as "friendshipId",
        friend.username as "username",
        friend.display_name as "displayName",
        concat($4::text, friend.avatar_relative_path) as "avatarUrl", 
        (
          SELECT
            CASE
              WHEN frs.status = $2 THEN 'accepted'
              WHEN frs."requesterId" = $3 THEN 'pending_sent'
              WHEN frs."recipientId" = $3 THEN 'pending_received'
              ELSE null
            END
          FROM friendships frs
          WHERE (frs."requesterId" = $3 AND frs."recipientId" = friend_ids_and_friendship_ids.friend_id)
          OR (frs."requesterId" = friend_ids_and_friendship_ids.friend_id AND frs."recipientId" = $3)
        ) as "friendshipStatus"
      FROM (
        SELECT
        frs.id,
        CASE
          WHEN frs."requesterId" = $1 THEN frs."recipientId"
          ELSE frs."requesterId"
        END as "friend_id"
        FROM friendships frs
        WHERE (frs."requesterId" = $1 OR frs."recipientId" = $1)
        AND frs.status = $2
      ) as friend_ids_and_friendship_ids
      LEFT JOIN users friend
      ON friend.id = friend_ids_and_friendship_ids.friend_id
    `;
    const params = [
      targetUserId,
      FriendshipStatus.ACCEPTED,
      currentUserId,
      storageUrl,
      limit,
    ];
    if (key) {
      params.push(`%${key}%`);
      getFriendsQuery += `
        WHERE (friend.username ILIKE $6
        OR friend.display_name ILIKE $6)
    `;
      if (cursor) {
        params.push(cursor);
        getFriendsQuery += `
        AND friend_ids_and_friendship_ids.id < $7
        `;
      }
    }
    if (cursor) {
      params.push(cursor);
      getFriendsQuery += `
        WHERE friend_ids_and_friendship_ids.id < $6
        `;
    }
    getFriendsQuery += `
      ORDER BY friend_ids_and_friendship_ids.id DESC
      LIMIT $5
    `;
    const friendList = await this.friendshipRepo.query<Friend[]>(
      getFriendsQuery,
      params,
    );
    return friendList;
  }

  async findMutualFriends(
    currentUserId: number,
    targetUserId: number,
    cursor?: Cursor,
  ) {
    const qb = this.friendshipRepo
      .createQueryBuilder('friendship')
      .leftJoinAndSelect('friendship.requester', 'requester')
      .leftJoinAndSelect('friendship.recipient', 'recipient')
      .where('friendship.status = :status', {
        status: FriendshipStatus.ACCEPTED,
      })
      .andWhere(
        new Brackets((qbInner) => {
          qbInner
            .where('requester.id = :currentUserId', { currentUserId })
            .orWhere('recipient.id = :currentUserId', { currentUserId });
        }),
      )
      .andWhere(
        new Brackets((qbInner) => {
          qbInner
            .where(
              `CASE WHEN requester.id = :currentUserId THEN recipient.id ELSE requester.id END IN (${this.friendshipRepo
                .createQueryBuilder('sub')
                .select(
                  `CASE WHEN sub.requesterId = :targetUserId THEN sub.recipientId ELSE sub.requesterId END`,
                )
                .where('sub.status = :status')
                .andWhere(
                  new Brackets((subInner) => {
                    subInner
                      .where('sub.requesterId = :targetUserId')
                      .orWhere('sub.recipientId = :targetUserId');
                  }),
                )
                .getQuery()})`,
              {
                currentUserId,
                targetUserId,
                status: FriendshipStatus.ACCEPTED,
              },
            )
            .andWhere(
              `CASE WHEN requester.id = :currentUserId THEN recipient.id ELSE requester.id END NOT IN (:...excludedIds)`,
              { excludedIds: [currentUserId, targetUserId], currentUserId },
            );
        }),
      )
      .orderBy('friendship.id', 'DESC')
      .take(this.configService.getOrThrow<number>('LIMIT_FRIEND_ITEM'));
    if (cursor?.id) {
      qb.andWhere('friendship.id < :id', { id: cursor.id });
    }
    return await qb.getMany();
  }

  async countFriends(userId: number) {
    return await this.friendshipRepo.count({
      where: [
        { requester: { id: userId }, status: FriendshipStatus.ACCEPTED },
        { recipient: { id: userId }, status: FriendshipStatus.ACCEPTED },
      ],
    });
  }

  async countSentFriendRequests(userId: number) {
    return await this.friendshipRepo.count({
      where: {
        requester: { id: userId },
        status: FriendshipStatus.PENDING,
      },
    });
  }

  async countReceivedFriendRequests(userId: number) {
    return await this.friendshipRepo.count({
      where: {
        recipient: { id: userId },
        status: FriendshipStatus.PENDING,
      },
    });
  }

  async countMutualFriends(currentUserId: number, targetUserId: number) {
    const subQuery = this.friendshipRepo
      .createQueryBuilder('sub')
      .select(
        `CASE WHEN sub.requesterId = :targetUserId THEN sub.recipientId ELSE sub.requesterId END`,
      )
      .where('sub.status = :status')
      .andWhere(
        new Brackets((subInner) => {
          subInner
            .where('sub.requesterId = :targetUserId')
            .orWhere('sub.recipientId = :targetUserId');
        }),
      )
      .getQuery();
    const qb = this.friendshipRepo
      .createQueryBuilder('friendship')
      .where('friendship.status = :status', {
        status: FriendshipStatus.ACCEPTED,
      })
      .andWhere(
        new Brackets((qbInner) => {
          qbInner
            .where('friendship.requesterId = :currentUserId', { currentUserId })
            .orWhere('friendship.recipientId = :currentUserId', {
              currentUserId,
            });
        }),
      )
      .andWhere(
        `CASE WHEN friendship.requesterId = :currentUserId THEN friendship.recipientId ELSE friendship.requesterId END IN (${subQuery})`,
      )
      .andWhere(
        `CASE WHEN friendship.requesterId = :currentUserId THEN friendship.recipientId ELSE friendship.requesterId END NOT IN (:...excludedIds)`,
        { excludedIds: [currentUserId, targetUserId], currentUserId },
      )
      .setParameters({
        currentUserId,
        targetUserId,
        status: FriendshipStatus.ACCEPTED,
      });
    return await qb.getCount();
  }
}
