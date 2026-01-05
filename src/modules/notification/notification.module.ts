import { Module } from '@nestjs/common';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationEntity } from '../entities/notification.entity';
import { NotificationRepository } from './notification.repository';
import { SessionModule } from '../token/session.module';
import { UserEntity } from '../entities/user.entity';
import { SessionEntity } from '../entities/session.entity';
import { BullModule } from '@nestjs/bullmq';
import { NotificationWorker } from './notification.worker';
import { FollowEntity } from '../entities/follow.entity';
import { NameNotificationQueue } from './helper/notification.helper';
import { FriendshipEntity } from '../entities/friendship.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      NotificationEntity,
      SessionEntity,
      UserEntity,
      FollowEntity,
      FriendshipEntity,
    ]),
    SessionModule,
    BullModule.registerQueue({
      name: NameNotificationQueue,
    }),
  ],
  controllers: [NotificationController],
  providers: [NotificationService, NotificationRepository, NotificationWorker],
  exports: [BullModule],
})
export class NotificationModule {}
