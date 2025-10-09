import { Module } from '@nestjs/common';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationEntity } from '../entities/notification.entity';
import { NotificationRepository } from './notification.repository';
import { SessionModule } from '../token/session.module';
import { UserEntity } from '../entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([NotificationEntity, UserEntity]),
    SessionModule,
  ],
  controllers: [NotificationController],
  providers: [NotificationService, NotificationRepository],
  exports: [NotificationService],
})
export class NotificationModule {}
