import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { FriendshipEntity } from '../entities/friendship.entity';
import { UserEntity } from '../entities/user.entity';
import { BlockEntity } from '../entities/block.entity';
import { FriendshipStatus } from '../enum/friendshipstatus.enum';
import { Cursor } from '../interface/cursor.interface';
import { ConfigService } from '@nestjs/config';

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

  async findFriendshipById(friendshipId: number) {
    return await this.friendshipRepo.findOne({
      where: { id: friendshipId },
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

  async findFriends(userId: number, cursor?: Cursor, key?: string) {
    const limit = this.configService.getOrThrow<number>('LIMIT_FRIEND_ITEM');

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
            .where(
              new Brackets((qbUser) => {
                qbUser.where('requester.id = :userId', { userId });
                if (key) {
                  qbUser.andWhere(
                    new Brackets((qbMatch) => {
                      qbMatch
                        .where('recipient.username ILIKE :key', {
                          key: `%${key}%`,
                        })
                        .orWhere('recipient.displayName ILIKE :key', {
                          key: `%${key}%`,
                        });
                    }),
                  );
                }
              }),
            )
            .orWhere(
              new Brackets((qbUser) => {
                qbUser.where('recipient.id = :userId', { userId });
                if (key) {
                  qbUser.andWhere(
                    new Brackets((qbMatch) => {
                      qbMatch
                        .where('requester.username ILIKE :key', {
                          key: `%${key}%`,
                        })
                        .orWhere('requester.displayName ILIKE :key', {
                          key: `%${key}%`,
                        });
                    }),
                  );
                }
              }),
            );
        }),
      )
      .orderBy('friendship.id', 'DESC')
      .take(limit);

    if (cursor?.id) {
      qb.andWhere('friendship.id < :id', { id: cursor.id });
    }
    return await qb.getMany();
  }

  async findAcceptedFriendIds(
    currentUserId: number,
    friendIds: number[],
  ): Promise<number[]> {
    if (friendIds.length === 0) {
      return [];
    }
    const rows = await this.friendshipRepo
      .createQueryBuilder('friendship')
      .select([
        'friendship.requesterId AS "requesterId"',
        'friendship.recipientId AS "recipientId"',
      ])
      .where('friendship.status = :status', {
        status: FriendshipStatus.ACCEPTED,
      })
      .andWhere(
        new Brackets((qb) => {
          qb.where(
            'friendship.requesterId = :currentUserId AND friendship.recipientId IN (:...friendIds)',
            { currentUserId, friendIds },
          ).orWhere(
            'friendship.recipientId = :currentUserId AND friendship.requesterId IN (:...friendIds)',
            { currentUserId, friendIds },
          );
        }),
      )
      .getRawMany<{ requesterId: number; recipientId: number }>();
    return rows.map((row) =>
      row.requesterId === currentUserId ? row.recipientId : row.requesterId,
    );
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
