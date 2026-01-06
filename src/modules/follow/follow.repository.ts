import { InjectRepository } from '@nestjs/typeorm';
import { FollowEntity } from '../entities/follow.entity';
import { Repository } from 'typeorm';
import { UserEntity } from '../entities/user.entity';
import { ConfigService } from '@nestjs/config';
import { Cursor } from '../interface/cursor.interface';
import { BlockEntity } from '../entities/block.entity';

export class FollowRepository {
  constructor(
    @InjectRepository(FollowEntity)
    private readonly followRepo: Repository<FollowEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(BlockEntity)
    private readonly blockRepo: Repository<BlockEntity>,
    private readonly configService: ConfigService,
  ) {}
  async findUserByUsername(username: string) {
    return await this.userRepo.findOne({ where: { username: username } });
  }
  async countFollowing(userId: number) {
    return await this.followRepo.count({
      where: { follower: { id: userId } },
    });
  }
  async countFollower(userId: number) {
    return await this.followRepo.count({
      where: { followee: { id: userId } },
    });
  }
  async findFollowers(
    followeeid: number,
    currentUserId: number,
    cursor?: Cursor,
  ) {
    const qb = this.followRepo
      .createQueryBuilder('follow')
      .leftJoinAndSelect('follow.follower', 'follower')
      .leftJoin(
        FollowEntity,
        'back',
        'back.followerId = :currentUserId AND back.followeeId = follower.id',
        { currentUserId },
      )
      .addSelect(
        'CASE WHEN (back.id IS NULL AND follower.id <> :currentUserId) THEN true ELSE false END',
        'canFollow',
      )
      .where('follow.followee=:followeeid', { followeeid: followeeid })
      .andWhere(
        (subQuery) => {
          const blockedSubQuery = subQuery
            .subQuery()
            .select('1')
            .from(BlockEntity, 'b')
            .where('b.blockerId = follower.id')
            .andWhere('b.blockedUserId = :currentUserId')
            .getQuery();
          return `NOT EXISTS ${blockedSubQuery}`;
        },
        { currentUserId },
      )
      .orderBy('follow.id', 'DESC')
      .take(this.configService.getOrThrow<number>('LIMIT_FOLLOW_ITEM'));
    if (cursor) {
      qb.andWhere('(follow.id < :id)', {
        id: cursor.id,
      });
    }
    const { entities, raw } = await qb.getRawAndEntities();

    const results = entities.map((entity, i) => ({
      ...entity,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      canFollow: !!raw[i].canFollow,
    }));
    return results;
  }
  async findFollowings(
    user: UserEntity,
    currentUserId: number,
    cursor?: Cursor,
  ) {
    const qb = this.followRepo
      .createQueryBuilder('follow')
      .leftJoinAndSelect('follow.followee', 'followee')
      .leftJoin(
        FollowEntity,
        'back',
        'back.followerId = :currentUserId AND back.followeeId = followee.id',
        { currentUserId },
      )
      .addSelect(
        'CASE WHEN (back.id IS NULL AND followee.id <> :currentUserId) THEN true ELSE false END',
        'canFollow',
      )
      .where('follow.follower=:followerid', { followerid: user.id })
      .andWhere(
        (subQuery) => {
          const blockedSubQuery = subQuery
            .subQuery()
            .select('1')
            .from(BlockEntity, 'b')
            .where('b.blockerId = followee.id')
            .andWhere('b.blockedUserId = :currentUserId')
            .getQuery();
          return `NOT EXISTS ${blockedSubQuery}`;
        },
        { currentUserId },
      )
      .orderBy('follow.id', 'DESC')
      .take(this.configService.getOrThrow<number>('LIMIT_FOLLOW_ITEM'));
    if (cursor) {
      qb.andWhere('(follow.id < :id)', {
        id: cursor.id,
      });
    }
    const { entities, raw } = await qb.getRawAndEntities();

    const results = entities.map((entity, i) => ({
      ...entity,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      canFollow: !!raw[i].canFollow,
    }));
    return results;
  }
  async findFollowersByKey(
    user: UserEntity,
    currentUserId: number,
    key: string,
    cursor?: Cursor,
  ) {
    const qb = this.followRepo
      .createQueryBuilder('follow')
      .leftJoinAndSelect('follow.follower', 'follower')
      .leftJoin(
        FollowEntity,
        'back',
        'back.followerId = :currentUserId AND back.followeeId = follower.id',
        { currentUserId },
      )
      .addSelect(
        'CASE WHEN (back.id IS NULL AND follower.id <> :currentUserId) THEN true ELSE false END',
        'canFollow',
      )
      .where('follow.followee=:followeeid', { followeeid: user.id })
      .andWhere(
        (subQuery) => {
          const blockedSubQuery = subQuery
            .subQuery()
            .select('1')
            .from(BlockEntity, 'b')
            .where('b.blockerId = follower.id')
            .andWhere('b.blockedUserId = :currentUserId')
            .getQuery();
          return `NOT EXISTS ${blockedSubQuery}`;
        },
        { currentUserId },
      )
      .andWhere(
        '(follower.username ILIKE :key OR follower.displayName ILIKE :key)',
        { key: `%${key}%` },
      )
      .orderBy('follow.id', 'DESC')
      .take(this.configService.getOrThrow<number>('LIMIT_FOLLOW_ITEM'));
    if (cursor) {
      qb.andWhere('(follow.id < :id)', {
        id: cursor.id,
      });
    }
    const { entities, raw } = await qb.getRawAndEntities();
    const results = entities.map((entity, i) => ({
      ...entity,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      canFollow: !!raw[i].canFollow,
    }));
    return results;
  }
  async findFollowingsByKey(
    user: UserEntity,
    currentUserId: number,
    key: string,
    cursor?: Cursor,
  ) {
    const qb = this.followRepo
      .createQueryBuilder('follow')
      .leftJoinAndSelect('follow.followee', 'followee')
      .leftJoin(
        FollowEntity,
        'back',
        'back.followerId = :currentUserId AND back.followeeId = followee.id',
        { currentUserId },
      )
      .addSelect(
        'CASE WHEN (back.id IS NULL AND followee.id <> :currentUserId) THEN true ELSE false END',
        'canFollow',
      )
      .where('follow.follower=:followerid', { followerid: user.id })
      .andWhere(
        (subQuery) => {
          const blockedSubQuery = subQuery
            .subQuery()
            .select('1')
            .from(BlockEntity, 'b')
            .where('b.blockerId = followee.id')
            .andWhere('b.blockedUserId = :currentUserId')
            .getQuery();
          return `NOT EXISTS ${blockedSubQuery}`;
        },
        { currentUserId },
      )
      .andWhere(
        '(followee.username ILIKE :key OR followee.displayName ILIKE :key)',
        { key: `%${key}%` },
      )
      .orderBy('follow.id', 'DESC')
      .take(this.configService.getOrThrow<number>('LIMIT_FOLLOW_ITEM'));
    if (cursor) {
      qb.andWhere('(follow.id < :id)', {
        id: cursor.id,
      });
    }
    const { entities, raw } = await qb.getRawAndEntities();
    const results = entities.map((entity, i) => ({
      ...entity,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      canFollow: !!raw[i].canFollow,
    }));
    return results;
  }
  async checkExistFollow(currentUserId: number, checkedUserId: number) {
    return await this.followRepo.exists({
      where: {
        follower: { id: currentUserId },
        followee: { id: checkedUserId },
      },
    });
  }
  async postFollow(followEntity: Partial<FollowEntity>) {
    return await this.followRepo.save(followEntity);
  }
  async deleteFollow(followEntity: Partial<FollowEntity>) {
    return await this.followRepo.delete(followEntity);
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
