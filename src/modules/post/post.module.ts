import { Module } from '@nestjs/common';
import { PostController } from './post.controller';
import { PostService } from './post.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostEntity } from '../entities/post.entity';
import { PostRepository } from './post.repository';
import { CommentEntity } from '../entities/comment.entity';
import { UserEntity } from '../entities/user.entity';
import { VoteEntity } from '../entities/vote.entity';
import { SaveEntity } from '../entities/save.entity';
import { SessionModule } from '../token/session.module';
import { SessionEntity } from '../entities/session.entity';

import { NotificationModule } from '../notification/notification.module';
import { HttpsModule } from '../http/http.module';

@Module({
  imports: [
    NotificationModule,
    HttpsModule,
    TypeOrmModule.forFeature([
      PostEntity,
      CommentEntity,
      UserEntity,
      VoteEntity,
      SaveEntity,
      SessionEntity,
    ]),
    SessionModule,
  ],
  controllers: [PostController],
  providers: [PostService, PostRepository],
})
export class PostModule {}
