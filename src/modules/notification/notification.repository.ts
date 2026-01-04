import { InjectRepository } from '@nestjs/typeorm';
import { NotificationEntity } from '../entities/notification.entity';
import { FindOptionsWhere, In, LessThan, Repository } from 'typeorm';
import { UserEntity } from '../entities/user.entity';
import { Cursor } from '../interface/cursor.interface';
import { ConfigService } from '@nestjs/config';
import { FollowEntity } from '../entities/follow.entity';
import { FriendshipEntity } from '../entities/friendship.entity';
import { FriendshipStatus } from '../enum/friendshipstatus.enum';

export class NotificationRepository {
  constructor(
    @InjectRepository(NotificationEntity)
    private readonly notificationRepo: Repository<NotificationEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(FollowEntity)
    private readonly followRepo: Repository<FollowEntity>,
    @InjectRepository(FriendshipEntity)
    private readonly friendshipRepo: Repository<FriendshipEntity>,
    private readonly configService: ConfigService,
  ) {}
  async findUserById(id: number) {
    return await this.userRepo.findOne({ where: { id: id } });
  }
  async findNotification(user: UserEntity, cursor?: Cursor) {
    let condition: FindOptionsWhere<NotificationEntity> = { owner: user };
    if (cursor?.id) {
      condition = { ...condition, id: LessThan(cursor.id) };
    }
    return await this.notificationRepo.find({
      where: condition,
      take: this.configService.getOrThrow<number>('LIMIT_NOTIFICATION_ITEM'),
      order: { id: 'DESC' },
    });
  }
  async saveNotification(notification: Partial<NotificationEntity>) {
    return await this.notificationRepo.save(notification);
  }
  async getUnreadNotificatiom(user: UserEntity, cursor?: Cursor) {
    let condition: FindOptionsWhere<NotificationEntity> = {
      owner: user,
      isRead: false,
    };
    if (cursor?.id) {
      condition = { ...condition, id: LessThan(cursor.id) };
    }
    return await this.notificationRepo.find({
      where: condition,
      take: this.configService.getOrThrow<number>('LIMIT_NOTIFICATION_ITEM'),
      order: { id: 'DESC' },
    });
  }
  async readNotification(notificationId: number, userId: number) {
    return await this.notificationRepo.update(
      { id: notificationId, owner: { id: userId }, isRead: false },
      { isRead: true },
    );
  }
  async deleteNotification(notificationId: number, userId: number) {
    return await this.notificationRepo.delete({
      id: notificationId,
      owner: { id: userId },
    });
  }
  async getUnreadNotificationCount(user: UserEntity) {
    return await this.notificationRepo.count({
      where: { owner: user, isRead: false },
    });
  }
  async getAllFollowers(followee: UserEntity) {
    const follows = await this.followRepo.find({
      where: { followee: followee },
      relations: { follower: true },
    });
    return follows.map((follow) => follow.follower);
  }
  async insertNotifications(
    notifications: Partial<NotificationEntity>[],
  ): Promise<NotificationEntity[]> {
    const insertResult = await this.notificationRepo
      .createQueryBuilder()
      .insert()
      .into(NotificationEntity)
      .values(notifications)
      .returning(['id'])
      .execute();
    const notificationIds: NotificationEntity[] =
      insertResult.generatedMaps as NotificationEntity[];
    const ids = notificationIds.map((n) => n.id);
    return this.notificationRepo.find({
      where: { id: In(ids) },
      relations: ['owner'],
    });
  }
  async getAllFriends(user: UserEntity) {
    const friendships = await this.friendshipRepo.find({
      where: [
        { requester: user, status: FriendshipStatus.ACCEPTED },
        { recipient: user, status: FriendshipStatus.ACCEPTED },
      ],
      relations: { recipient: true, requester: true },
    });
    return friendships.map((friendship) => {
      if (friendship.requester.id === user.id) {
        return friendship.recipient;
      }
      return friendship.requester;
    });
  }
  async readAllNotifications(userId: number) {
    return await this.notificationRepo
      .createQueryBuilder()
      .update()
      .set({ isRead: true })
      .where('user_id = :userId', { userId })
      .execute();
  }
}
