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
import { CommentEntity } from '../entities/comment.entity';
import { BlockEntity } from '../entities/block.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ContentEntity,
      CommentEntity,
      UserEntity,
      BlockEntity,
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
