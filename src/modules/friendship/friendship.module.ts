import { Module } from '@nestjs/common';
import { FriendshipController } from './friendship.controller';
import { FriendshipService } from './friendship.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FriendshipRepository } from './friendship.repository';
import { FriendshipEntity } from '../entities/friendship.entity';
import { UserEntity } from '../entities/user.entity';
import { SessionEntity } from '../entities/session.entity';
import { BlockEntity } from '../entities/block.entity';
import { SessionModule } from '../token/session.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FriendshipEntity,
      UserEntity,
      SessionEntity,
      BlockEntity,
    ]),
    SessionModule,
    NotificationModule,
  ],
  controllers: [FriendshipController],
  providers: [FriendshipService, FriendshipRepository],
})
export class FriendshipModule {}
