import { Module } from '@nestjs/common';
import { BlockController } from './block.controller';
import { BlockService } from './block.service';
import { BlockRepository } from './block.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlockEntity } from '../entities/block.entity';
import { UserEntity } from '../entities/user.entity';
import { FollowEntity } from '../entities/follow.entity';
import { FriendshipEntity } from '../entities/friendship.entity';
import { SessionEntity } from '../entities/session.entity';
import { SessionModule } from '../token/session.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BlockEntity,
      UserEntity,
      FollowEntity,
      FriendshipEntity,
      SessionEntity,
    ]),
    SessionModule,
  ],
  controllers: [BlockController],
  providers: [BlockService, BlockRepository],
})
export class BlockModule {}
