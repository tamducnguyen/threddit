import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { ConversationController } from './conversation.controller';
import { ConversationService } from './conversation.service';
import { ConversationRepository } from './conversation.repository';
import { SessionModule } from '../token/session.module';
import { BlockModule } from '../block/block.module';
import { GatewayService } from '../gateway/gateway.service';
import { NameGatewayQueue } from '../gateway/helper/gateway-queue.helper';
import { ConversationEntity } from '../../entities/conversation.entity';
import { ConversationMemberEntity } from '../../entities/conversation-member.entity';
import { SessionEntity } from '../../entities/session.entity';
import { UserEntity } from '../../entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ConversationEntity,
      ConversationMemberEntity,
      SessionEntity,
      UserEntity,
    ]),
    SessionModule,
    BlockModule,
    // Registers this module's own producer client for the gateway's job
    // queue. `GatewayService` only needs `@InjectQueue`, so this lets
    // `ConversationService` enqueue realtime side-effects (room join/leave,
    // broadcasts) without importing `GatewayModule` — avoiding the
    // Gateway<->Conversation circular dependency that previously required
    // `forwardRef` on both sides.
    BullModule.registerQueue({ name: NameGatewayQueue }),
  ],
  controllers: [ConversationController],
  providers: [ConversationService, ConversationRepository, GatewayService],
  exports: [ConversationService, ConversationRepository],
})
export class ConversationModule {}
