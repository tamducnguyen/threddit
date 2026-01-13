import { Module } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { ProfileController } from './profile.controller';
import { ProfileRepository } from './profile.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '../entities/user.entity';
import { SessionEntity } from '../entities/session.entity';
import { StorageModule } from '../storage/storage.module';
import { BlockEntity } from '../entities/block.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, SessionEntity, BlockEntity]),
    StorageModule,
  ],
  providers: [ProfileService, ProfileRepository],
  controllers: [ProfileController],
})
export class ProfileModule {}
