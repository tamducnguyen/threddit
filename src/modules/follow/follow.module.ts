import { Module } from '@nestjs/common';
import { FollowController } from './follow.controller';
import { FollowService } from './follow.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '../entities/user.entity';
import { FollowEntity } from '../entities/follow.entity';
import { FollowRepository } from './follow.repository';
import { SessionModule } from '../token/session.module';
import { NotificationModule } from '../notification/notification.module';
import { SessionEntity } from '../entities/session.entity';
import { BlockEntity } from '../entities/block.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      SessionEntity,
      FollowEntity,
      BlockEntity,
    ]),
    SessionModule,
    NotificationModule,
  ],
  controllers: [FollowController],
  providers: [FollowService, FollowRepository],
})
export class FollowModule {}
