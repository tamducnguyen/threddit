import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { MessageController } from './message.controller';
import { MessageService } from './message.service';
import { ConversationInsightsService } from './conversation-insights.service';
import { MessageRepository } from './message.repository';
import { ConversationModule } from '../conversation/conversation.module';
import { SessionModule } from '../token/session.module';
import { StorageModule } from '../storage/storage.module';
import { RagModule } from '../rag/rag.module';
import { NameNotificationQueue } from '../notification/helper/notification.helper';
import { MessageEntity } from '../../entities/message.entity';
import { MediaFileEntity } from '../../entities/media-file.entity';
import { ReactionEntity } from '../../entities/reaction.entity';
import { SessionEntity } from '../../entities/session.entity';
import { MessageMentionEntity } from '../../entities/message-mention.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MessageEntity,
      MediaFileEntity,
      ReactionEntity,
      SessionEntity,
      MessageMentionEntity,
    ]),
    ConversationModule,
    SessionModule,
    StorageModule,
    RagModule,
    BullModule.registerQueue({ name: NameNotificationQueue }),
  ],
  controllers: [MessageController],
  providers: [MessageService, ConversationInsightsService, MessageRepository],
  exports: [MessageService, ConversationInsightsService],
})
export class MessageModule {}
