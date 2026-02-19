import { Module } from '@nestjs/common';
import { ContentController } from './content.controller';
import { ContentService } from './content.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContentEntity } from '../entities/content.entity';
import { ContentRepository } from './content.repository';
import { CommentEntity } from '../entities/comment.entity';
import { UserEntity } from '../entities/user.entity';
import { SaveEntity } from '../entities/save.entity';
import { SessionModule } from '../token/session.module';
import { SessionEntity } from '../entities/session.entity';
import { NotificationModule } from '../notification/notification.module';
import { HttpsModule } from '../http/http.module';
import { BlockEntity } from '../entities/block.entity';
import { StorageModule } from '../storage/storage.module';
import { MediaFileEntity } from '../entities/media-file.entity';
import { FriendshipEntity } from '../entities/friendship.entity';

@Module({
  imports: [
    NotificationModule,
    HttpsModule,
    StorageModule,
    TypeOrmModule.forFeature([
      ContentEntity,
      CommentEntity,
      UserEntity,
      SaveEntity,
      BlockEntity,
      SessionEntity,
      MediaFileEntity,
      FriendshipEntity,
    ]),
    SessionModule,
  ],
  controllers: [ContentController],
  providers: [ContentService, ContentRepository],
})
export class ContentModule {}
