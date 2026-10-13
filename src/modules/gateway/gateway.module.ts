import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { ChatGateway } from './chat.gateway';
import { GatewayService } from './gateway.service';
import { GatewayWorker } from './gateway.worker';
import { PresenceService } from './presence.service';
import { NameGatewayQueue } from './helper/gateway-queue.helper';
import { UserEntity } from '../../entities/user.entity';
import { SessionModule } from '../token/session.module';
import { ConversationModule } from '../conversation/conversation.module';
import { MessageModule } from '../message/message.module';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { REDIS_PROVIDER } from './constants/provider.constant';

/**
 * Realtime transport layer: the Socket.IO gateway, presence tracking, and the
 * queue/worker that fan conversation websocket side-effects (room join/leave,
 * broadcasts) out asynchronously. `ChatGateway` reads/writes through
 * `ConversationService`/`MessageService` only (never their repositories
 * directly), so this module depends on `ConversationModule`/`MessageModule`
 * in one direction only — neither of those imports `GatewayModule` back
 * (they enqueue realtime side-effects by registering their own producer
 * client for this same named queue), so no `forwardRef` is needed anymore.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity]),
    SessionModule,
    ConversationModule,
    MessageModule,
    BullModule.registerQueue({
      name: NameGatewayQueue,
    }),
  ],
  providers: [
    ChatGateway,
    PresenceService,
    {
      provide: REDIS_PROVIDER,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        new Redis(configService.getOrThrow<string>('REDIS_URL')),
    },
    GatewayService,
    GatewayWorker,
  ],
  exports: [GatewayService, GatewayWorker],
})
export class GatewayModule {}
