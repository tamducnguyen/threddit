import { InjectRepository } from '@nestjs/typeorm';
import { FollowEntity } from '../entities/follow.entity';
import { Repository } from 'typeorm';
import { UserEntity } from '../entities/user.entity';
import { ConfigService } from '@nestjs/config';
import { Cursor } from '../interface/cursor.interface';

export class FollowRepository {
  constructor(
    @InjectRepository(FollowEntity)
    private readonly followRepo: Repository<FollowEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    private readonly configService: ConfigService,
  ) {}
  async findUserByUsername(username: string) {
    return await this.userRepo.findOne({ where: { username: username } });
  }
  async countFollowing(user: UserEntity) {
    return await this.followRepo.count({ where: { follower: user } });
  }
  async countFollower(user: UserEntity) {
    return await this.followRepo.count({ where: { followee: user } });
  }
  async findFollowers(
    user: UserEntity,
    currentUserId: string,
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
    currentUserId: string,
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
  async checkExistFollow(currentUser: UserEntity, followedUser: UserEntity) {
    return await this.followRepo.exists({
      where: { follower: currentUser, followee: followedUser },
    });
  }
  async postFollow(followEntity: Partial<FollowEntity>) {
    return await this.followRepo.save(followEntity);
  }
  async deleteFollow(followEntity: Partial<FollowEntity>) {
    return await this.followRepo.delete(followEntity);
  }
}
