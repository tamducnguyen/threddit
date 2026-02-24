import { Module } from '@nestjs/common';
import { ReactionController } from './reaction.controller';
import { ReactionService } from './reaction.service';
import { ReactionRepository } from './reaction.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContentEntity } from '../entities/content.entity';
import { UserEntity } from '../entities/user.entity';
import { ReactionEntity } from '../entities/reaction.entity';
import { SessionEntity } from '../entities/session.entity';
import { SessionModule } from '../token/session.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ContentEntity,
      UserEntity,
      ReactionEntity,
      SessionEntity,
    ]),
    SessionModule,
    NotificationModule,
  ],
  controllers: [ReactionController],
  providers: [ReactionService, ReactionRepository],
})
export class ReactionModule {}
