import {
  ChatSendMessageInvalidTargetException,
  ChatGetMessagesConversationNotFoundException,
  ChatGetMessagesCursorInvalidException,
  ChatRevokeMessageNotFoundException,
  ChatRevokeMessageForbiddenException,
  ChatReactMessageNotAMemberException,
} from '../../common/exception';
import { MessageService } from './message.service';
import { MessageRepository } from './message.repository';
import { ConversationRepository } from '../conversation/conversation.repository';
import { ConversationService } from '../conversation/conversation.service';
import { StorageService } from '../storage/storage.service';
import { JwtService } from '@nestjs/jwt';
import { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { ConversationMemberRole } from '../../enum/conversation-member-role.enum';
import { ConversationType } from '../../enum/conversation-type.enum';
import { ReactionType } from '../../enum/reactiontype.enum';
import { SendMessageDTO } from './dtos/send-message.dto';

/**
 * Unit tests for MessageService's authorization + pagination logic. The
 * repositories and the conversation service are fully mocked, so these exercise
 * business rules (membership, roles, revoke permissions, cursor handling)
 * rather than SQL.
 */
describe('MessageService', () => {
  let service: MessageService;
  let messageRepo: Record<string, jest.Mock>;
  let conversationRepo: Record<string, jest.Mock>;
  let jwtService: jest.Mocked<Pick<JwtService, 'signAsync' | 'verifyAsync'>>;
  let notificationQueue: Record<string, jest.Mock>;

  beforeEach(() => {
    messageRepo = {
      findMessagesPage: jest.fn(),
      findMessageContext: jest.fn(),
      revokeMessageById: jest.fn(),
      findMessageReactionByUser: jest.fn(),
      insertMessageReaction: jest.fn(),
      updateMessageReactionType: jest.fn(),
      deleteMessageReaction: jest.fn(),
      getMessageReactionCounts: jest.fn(),
    };
    conversationRepo = {
      findMembership: jest.fn(),
      updateConversationLastMessage: jest.fn(),
    };
    jwtService = {
      signAsync: jest.fn().mockResolvedValue('SIGNED_CURSOR'),
      verifyAsync: jest.fn(),
    };
    const configValues: Record<string, number> = {
      MESSAGE_LIMIT: 20,
    };
    const configService = {
      getOrThrow: jest.fn((key: string) => configValues[key]),
    };
    notificationQueue = {
      add: jest.fn().mockResolvedValue(undefined),
    };

    service = new MessageService(
      messageRepo as unknown as MessageRepository,
      conversationRepo as unknown as ConversationRepository,
      {} as unknown as ConversationService,
      {} as unknown as StorageService,
      jwtService as unknown as JwtService,
      configService as unknown as ConfigService,
      notificationQueue as unknown as Queue,
    );
  });

  describe('sendMessage', () => {
    it('throws when both username and conversationId are provided', async () => {
      const dto: SendMessageDTO = {
        username: 'alice',
        conversationId: 1,
        text: 'hi',
      };
      await expect(service.sendMessage(1, dto)).rejects.toBeInstanceOf(
        ChatSendMessageInvalidTargetException,
      );
    });

    it('throws when neither target is provided', async () => {
      const dto: SendMessageDTO = { text: 'hi' };
      await expect(service.sendMessage(1, dto)).rejects.toBeInstanceOf(
        ChatSendMessageInvalidTargetException,
      );
    });
  });

  describe('getMessages', () => {
    it('throws NotFound when the conversation is missing or the requester is not a member', async () => {
      // findMembership returns null for both cases, so both surface as 404.
      conversationRepo.findMembership.mockResolvedValue(null);
      await expect(service.getMessages(1, 99)).rejects.toBeInstanceOf(
        ChatGetMessagesConversationNotFoundException,
      );
    });

    it('returns a null cursor when fewer than `limit` rows come back', async () => {
      conversationRepo.findMembership.mockResolvedValue({
        role: ConversationMemberRole.MEMBER,
      });
      messageRepo.findMessagesPage.mockResolvedValue([
        {
          id: 2,
          createdAt: new Date(),
          sender: {} as never,
          mediaFiles: [],
          isRevoked: false,
          reactions: [],
        },
      ]);

      const result = await service.getMessages(1, 5);

      expect(result.data?.cursor).toBeNull();
      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });

    it('signs a next cursor when a full page is returned', async () => {
      conversationRepo.findMembership.mockResolvedValue({
        role: ConversationMemberRole.MEMBER,
      });
      // The page size is forced to CHAT_PAGE_LIMIT (20 in the config mock), so a
      // "full" page must return exactly that many rows for a cursor to be issued.
      const page = Array.from({ length: 20 }, (_, index) => ({
        id: index + 1,
        sender: {} as never,
        mediaFiles: [],
        isRevoked: false,
        reactions: [],
      }));
      messageRepo.findMessagesPage.mockResolvedValue(page);

      const result = await service.getMessages(1, 5);

      expect(jwtService.signAsync).toHaveBeenCalledWith({ id: 20 });
      expect(result.data?.cursor).toBe('SIGNED_CURSOR');
    });

    it('decodes and forwards a provided cursor to the repository', async () => {
      conversationRepo.findMembership.mockResolvedValue({
        role: ConversationMemberRole.MEMBER,
      });
      jwtService.verifyAsync.mockResolvedValue({ id: 10 } as never);
      messageRepo.findMessagesPage.mockResolvedValue([]);

      await service.getMessages(1, 5, 'SOME_CURSOR');

      expect(messageRepo.findMessagesPage).toHaveBeenCalledWith(5, { id: 10 });
    });

    it('rejects an invalid cursor with BadRequest', async () => {
      conversationRepo.findMembership.mockResolvedValue({
        role: ConversationMemberRole.MEMBER,
      });
      jwtService.verifyAsync.mockRejectedValue(new Error('bad token'));

      await expect(service.getMessages(1, 5, 'BROKEN')).rejects.toBeInstanceOf(
        ChatGetMessagesCursorInvalidException,
      );
    });
  });

  describe('revokeMessage', () => {
    it('throws when the message does not exist', async () => {
      messageRepo.findMessageContext.mockResolvedValue(null);
      await expect(service.revokeMessage(1, 50)).rejects.toBeInstanceOf(
        ChatRevokeMessageNotFoundException,
      );
    });

    it('lets the sender revoke their own message', async () => {
      messageRepo.findMessageContext.mockResolvedValue({
        id: 50,
        senderId: 1,
        conversationId: 5,
        conversationType: ConversationType.GROUP,
        isRevoked: false,
      });

      const result = await service.revokeMessage(1, 50);

      expect(messageRepo.revokeMessageById).toHaveBeenCalledWith(50);
      expect(result).toEqual({ messageId: 50, conversationId: 5 });
    });

    it('forbids a non-sender from revoking', async () => {
      messageRepo.findMessageContext.mockResolvedValue({
        id: 50,
        senderId: 2,
        conversationId: 5,
        conversationType: ConversationType.GROUP,
        isRevoked: false,
      });

      await expect(service.revokeMessage(1, 50)).rejects.toBeInstanceOf(
        ChatRevokeMessageForbiddenException,
      );
      expect(messageRepo.revokeMessageById).not.toHaveBeenCalled();
    });
  });

  describe('message reactions', () => {
    it('throws when reacting as a non-member', async () => {
      messageRepo.findMessageContext.mockResolvedValue({
        id: 50,
        senderId: 2,
        conversationId: 5,
        conversationType: ConversationType.GROUP,
        isRevoked: false,
      });
      conversationRepo.findMembership.mockResolvedValue(null);

      await expect(
        service.setMessageReaction(1, 50, ReactionType.LIKE),
      ).rejects.toBeInstanceOf(ChatReactMessageNotAMemberException);
    });

    it('inserts a fresh reaction and returns counts', async () => {
      messageRepo.findMessageContext.mockResolvedValue({
        id: 50,
        senderId: 2,
        conversationId: 5,
        conversationType: ConversationType.GROUP,
        isRevoked: false,
      });
      conversationRepo.findMembership.mockResolvedValue({
        role: ConversationMemberRole.MEMBER,
      });
      messageRepo.findMessageReactionByUser.mockResolvedValue(null);
      messageRepo.getMessageReactionCounts.mockResolvedValue([
        { type: ReactionType.LIKE, count: 1 },
      ]);

      const result = await service.setMessageReaction(1, 50, ReactionType.LIKE);

      expect(messageRepo.insertMessageReaction).toHaveBeenCalledWith(
        50,
        1,
        ReactionType.LIKE,
      );
      expect(result).toEqual({
        conversationId: 5,
        reactions: [{ type: ReactionType.LIKE, count: 1 }],
      });
    });

    it('updates the reaction type when one already exists with a different type', async () => {
      messageRepo.findMessageContext.mockResolvedValue({
        id: 50,
        senderId: 2,
        conversationId: 5,
        conversationType: ConversationType.GROUP,
        isRevoked: false,
      });
      conversationRepo.findMembership.mockResolvedValue({
        role: ConversationMemberRole.MEMBER,
      });
      messageRepo.findMessageReactionByUser.mockResolvedValue({
        id: 77,
        type: ReactionType.LIKE,
      } as never);
      messageRepo.getMessageReactionCounts.mockResolvedValue([
        { type: ReactionType.LOVE, count: 1 },
      ]);

      await service.setMessageReaction(1, 50, ReactionType.LOVE);

      expect(messageRepo.updateMessageReactionType).toHaveBeenCalledWith(
        77,
        ReactionType.LOVE,
      );
      expect(messageRepo.insertMessageReaction).not.toHaveBeenCalled();
    });
  });
});
