import { Module } from '@nestjs/common';
import { CommentController } from './comment.controller';
import { CommentService } from './comment.service';
import { CommentRepository } from './comment.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContentEntity } from '../entities/content.entity';
import { UserEntity } from '../entities/user.entity';
import { CommentEntity } from '../entities/comment.entity';
import { SessionEntity } from '../entities/session.entity';
import { SessionModule } from '../token/session.module';
import { HttpsModule } from '../http/http.module';
import { NotificationModule } from '../notification/notification.module';
import { BlockEntity } from '../entities/block.entity';
import { MediaFileEntity } from '../entities/media-file.entity';
import { StorageModule } from '../storage/storage.module';
import { FriendshipEntity } from '../entities/friendship.entity';
import { ReactionEntity } from '../entities/reaction.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ContentEntity,
      UserEntity,
      CommentEntity,
      BlockEntity,
      MediaFileEntity,
      SessionEntity,
      FriendshipEntity,
      ReactionEntity,
    ]),
    SessionModule,
    HttpsModule,
    NotificationModule,
    StorageModule,
  ],
  controllers: [CommentController],
  providers: [CommentService, CommentRepository],
})
export class CommentModule {}
