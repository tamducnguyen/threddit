import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { BlockEntity } from '../entities/block.entity';
import { UserEntity } from '../entities/user.entity';
import { FollowEntity } from '../entities/follow.entity';
import { FriendshipEntity } from '../entities/friendship.entity';
import { ConfigService } from '@nestjs/config';
import { Cursor } from '../interface/cursor.interface';

export class BlockRepository {
  constructor(
    @InjectRepository(BlockEntity)
    private readonly blockRepo: Repository<BlockEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {}

  async findUserByUsername(username: string) {
    return await this.userRepo.findOne({ where: { username: username } });
  }

  async findUserById(userId: number) {
    return await this.userRepo.findOne({ where: { id: userId } });
  }

  async checkBlocked(blockerId: number, blockedId: number) {
    return await this.blockRepo.exists({
      where: {
        blocker: { id: blockerId },
        blockedUser: { id: blockedId },
      },
    });
  }

  async createBlockAndCleanup(blocker: UserEntity, blockedUser: UserEntity) {
    return await this.dataSource.transaction(async (manager) => {
      const blockRepo = manager.getRepository(BlockEntity);
      const followRepo = manager.getRepository(FollowEntity);
      const friendshipRepo = manager.getRepository(FriendshipEntity);

      // create block record
      await blockRepo.save({
        blocker: blocker,
        blockedUser: blockedUser,
      });

      // remove follow in both directions if any
      await followRepo.delete([
        { follower: { id: blocker.id }, followee: { id: blockedUser.id } },
        { follower: { id: blockedUser.id }, followee: { id: blocker.id } },
      ]);

      // remove friendship in both directions if any
      await friendshipRepo.delete([
        { requester: { id: blocker.id }, recipient: { id: blockedUser.id } },
        { requester: { id: blockedUser.id }, recipient: { id: blocker.id } },
      ]);
    });
  }

  async findBlockedUsers(blockerId: number, cursor?: Cursor, key?: string) {
    const qb = this.blockRepo
      .createQueryBuilder('block')
      .leftJoinAndSelect('block.blockedUser', 'blockedUser')
      .where('block.blockerId = :blockerId', { blockerId })
      .orderBy('block.id', 'DESC')
      .take(this.configService.getOrThrow<number>('LIMIT_BLOCK_ITEM'));

    if (key) {
      qb.andWhere(
        '(blockedUser.username ILIKE :key OR blockedUser.displayName ILIKE :key)',
        { key: `%${key}%` },
      );
    }

    if (cursor?.id) {
      qb.andWhere('block.id < :id', { id: cursor.id });
    }

    return await qb.getMany();
  }

  async deleteBlock(blockerId: number, blockedId: number) {
    return await this.blockRepo.delete({
      blocker: { id: blockerId },
      blockedUser: { id: blockedId },
    });
  }
  async getBlockedUserCount(blockerUserId: number) {
    return await this.blockRepo.count({
      where: { blocker: { id: blockerUserId } },
    });
  }
}
