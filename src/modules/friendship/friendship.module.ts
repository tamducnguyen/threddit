import { Module } from '@nestjs/common';
import { FriendshipController } from './friendship.controller';
import { FriendshipService } from './friendship.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FriendshipRepository } from './friendship.repository';
import { FriendshipEntity } from '../../entities/friendship.entity';
import { UserEntity } from '../../entities/user.entity';
import { SessionEntity } from '../../entities/session.entity';
import { SessionModule } from '../token/session.module';
import { NotificationModule } from '../notification/notification.module';
import { BlockModule } from '../block/block.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([FriendshipEntity, UserEntity, SessionEntity]),
    SessionModule,
    NotificationModule,
    BlockModule,
  ],
  controllers: [FriendshipController],
  providers: [FriendshipService, FriendshipRepository],
})
export class FriendshipModule {}
