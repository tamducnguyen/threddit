import { Module } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { ProfileController } from './profile.controller';
import { ProfileRepository } from './profile.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '../../entities/user.entity';
import { SessionEntity } from '../../entities/session.entity';
import { StorageModule } from '../storage/storage.module';
import { FriendshipEntity } from '../../entities/friendship.entity';
import { SessionModule } from '../token/session.module';
import { BlockModule } from '../block/block.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, SessionEntity, FriendshipEntity]),
    SessionModule,
    StorageModule,
    BlockModule,
  ],
  providers: [ProfileService, ProfileRepository],
  controllers: [ProfileController],
})
export class ProfileModule {}
