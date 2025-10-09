import { InjectRepository } from '@nestjs/typeorm';
import { NotificationEntity } from '../entities/notification.entity';
import { FindOptionsWhere, LessThan, Repository } from 'typeorm';
import { UserEntity } from '../entities/user.entity';
import { Cursor } from '../interface/cursor.interface';
import { ConfigService } from '@nestjs/config';

export class NotificationRepository {
  constructor(
    @InjectRepository(NotificationEntity)
    private readonly notificationRepo: Repository<NotificationEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    private readonly configService: ConfigService,
  ) {}
  async findUserById(id: string) {
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
  async checkNotification(id: number) {
    return await this.notificationRepo.exists({
      where: { id: id, isRead: true },
    });
  }
  async switchReadState(id: number) {
    return await this.notificationRepo.update({ id: id }, { isRead: true });
  }
  async getUnreadNotificationCount(user: UserEntity) {
    return await this.notificationRepo.count({
      where: { owner: user, isRead: false },
    });
  }
}
