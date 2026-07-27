import { ChatGateway } from './chat.gateway';
import { MessageService } from '../message/message.service';
import { ConversationService } from '../conversation/conversation.service';
import { GatewayService } from './gateway.service';
import { GatewayWorker } from './gateway.worker';
import { PresenceService } from './presence.service';
import { ChatRateLimiterService } from './chat-rate-limiter.service';
import { ConfigService } from '@nestjs/config';
import { SessionService } from '../token/session.service';
import { UserEntity } from '../../entities/user.entity';
import { Repository } from 'typeorm';
import { chatEvent, chatRoom } from '../../common/helper/chat.helper';
import { ReactionType } from '../../enum/reactiontype.enum';

/**
 * Verifies the gateway's socket handlers call the right service and enqueue
 * the right broadcast job. The Socket.IO server/socket and `GatewayService`
 * (the job-queue producer) are mocked, so these run without infrastructure
 * (the full client↔server flow is covered by the infra-gated
 * test/chat.e2e-spec.ts).
 */
describe('ChatGateway', () => {
  let gateway: ChatGateway;
  let messageService: Record<string, jest.Mock>;
  let gatewayService: Record<string, jest.Mock>;
  let gatewayWorker: Record<string, jest.Mock>;
  let to: jest.Mock;
  let client: { data: { user: { sub: number; username: string } } } & {
    broadcast: { to: jest.Mock };
  };
  let broadcastEmit: jest.Mock;

  beforeEach(() => {
    messageService = {
      revokeMessage: jest.fn(),
      setMessageReaction: jest.fn(),
      removeMessageReaction: jest.fn(),
    };
    gatewayService = {
      broadcastToConversation: jest.fn(),
      joinMembersToRoom: jest.fn(),
    };
    gatewayWorker = {
      setServer: jest.fn(),
    };
    const chatRateLimiterService = {
      checkLimit: jest.fn().mockResolvedValue(true),
    };
    const configValues: Record<string, number> = {
      CHAT_SEND_MESSAGE_RATE_LIMIT: 10,
      CHAT_SEND_MESSAGE_RATE_WINDOW_MS: 10000,
      CHAT_TYPING_RATE_LIMIT: 20,
      CHAT_TYPING_RATE_WINDOW_MS: 10000,
    };
    const configService = {
      getOrThrow: jest.fn((key: string) => configValues[key]),
    };

    gateway = new ChatGateway(
      {} as unknown as SessionService,
      {} as unknown as Repository<UserEntity>,
      messageService as unknown as MessageService,
      {} as unknown as ConversationService,
      gatewayService as unknown as GatewayService,
      {} as unknown as PresenceService,
      gatewayWorker as unknown as GatewayWorker,
      chatRateLimiterService as unknown as ChatRateLimiterService,
      configService as unknown as ConfigService,
    );

    to = jest.fn();
    gateway.server = { to } as never;

    broadcastEmit = jest.fn();
    client = {
      data: { user: { sub: 1, username: 'alice' } },
      broadcast: { to: jest.fn().mockReturnValue({ emit: broadcastEmit }) },
    };
  });

  it('afterInit hands the server to the gateway worker', () => {
    const server = { to, use: jest.fn() } as never;
    gateway.afterInit(server);
    expect(gatewayWorker.setServer).toHaveBeenCalledWith(server);
  });

  it('enqueues a message_revoked broadcast to the conversation room', async () => {
    messageService.revokeMessage.mockResolvedValue({
      messageId: 50,
      conversationId: 5,
    });

    await gateway.handleRevokeMessage(client as never, { messageId: 50 });

    expect(messageService.revokeMessage).toHaveBeenCalledWith(1, 50);
    expect(gatewayService.broadcastToConversation).toHaveBeenCalledWith(
      5,
      chatEvent.MESSAGE_REVOKED,
      expect.any(String),
      { messageId: 50, conversationId: 5 },
    );
  });

  it('enqueues a reaction_updated broadcast with aggregated counts on react', async () => {
    const reactions = [{ type: ReactionType.LIKE, count: 2 }];
    messageService.setMessageReaction.mockResolvedValue({
      conversationId: 5,
      reactions,
    });

    await gateway.handleReactMessage(client as never, {
      messageId: 50,
      type: ReactionType.LIKE,
    });

    expect(messageService.setMessageReaction).toHaveBeenCalledWith(
      1,
      50,
      ReactionType.LIKE,
    );
    expect(gatewayService.broadcastToConversation).toHaveBeenCalledWith(
      5,
      chatEvent.REACTION_UPDATED,
      expect.any(String),
      { messageId: 50, conversationId: 5, reactions },
    );
  });

  it('enqueues a reaction_updated broadcast on unreact', async () => {
    messageService.removeMessageReaction.mockResolvedValue({
      conversationId: 5,
      reactions: [],
    });

    await gateway.handleUnreactMessage(client as never, { messageId: 50 });

    expect(messageService.removeMessageReaction).toHaveBeenCalledWith(1, 50);
    expect(gatewayService.broadcastToConversation).toHaveBeenCalledWith(
      5,
      chatEvent.REACTION_UPDATED,
      expect.any(String),
      { messageId: 50, conversationId: 5, reactions: [] },
    );
  });

  it('relays user_typing to the rest of the room via broadcast', () => {
    gateway.handleTyping(client as never, {
      conversationId: 5,
      isTyping: true,
    });

    expect(client.broadcast.to).toHaveBeenCalledWith(chatRoom.conversation(5));
    expect(broadcastEmit).toHaveBeenCalledWith(
      chatEvent.USER_TYPING,
      expect.objectContaining({
        data: {
          conversationId: 5,
          userId: 1,
          username: 'alice',
          isTyping: true,
        },
      }),
    );
  });
});
