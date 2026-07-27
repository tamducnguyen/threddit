import { ConversationService } from './conversation.service';
import { ConversationRepository } from './conversation.repository';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { BlockService } from '../block/block.service';
import { GatewayService } from '../gateway/gateway.service';
import { ConversationMemberRole } from '../../enum/conversation-member-role.enum';
import { ConversationType } from '../../enum/conversation-type.enum';
import {
  ChatMemberForbiddenException,
  ChatMemberNotAGroupException,
  ChatMemberAlreadyMemberException,
  ChatPinConversationNotFoundException,
  ChatPinPinLimitExceededException,
  ChatListConversationsCursorInvalidException,
} from '../../common/exception';

/**
 * Unit tests for ConversationService's authorization + pagination logic. The
 * repository is fully mocked, so these exercise business rules (membership,
 * roles, pin limit, cursor handling) rather than SQL.
 */
describe('ConversationService', () => {
  let service: ConversationService;
  let conversationRepo: Record<string, jest.Mock>;
  let jwtService: jest.Mocked<Pick<JwtService, 'signAsync' | 'verifyAsync'>>;
  let blockService: Record<string, jest.Mock>;
  let gatewayService: Record<string, jest.Mock>;

  beforeEach(() => {
    conversationRepo = {
      findConversationById: jest.fn(),
      findMembership: jest.fn(),
      findConversationsPage: jest.fn(),
      findUserById: jest.fn(),
      findUserByUsername: jest.fn(),
      findUsersByUsernames: jest.fn(),
      createGroupConversation: jest.fn(),
      addMemberToConversation: jest.fn(),
      removeMemberFromConversation: jest.fn(),
      setMembershipPinned: jest.fn(),
      countPinnedConversations: jest.fn(),
    };
    jwtService = {
      signAsync: jest.fn().mockResolvedValue('SIGNED_CURSOR'),
      verifyAsync: jest.fn(),
    };
    const configValues: Record<string, number> = {
      CONVERSATION_LIMIT: 20,
      MAX_PINNED_CONVERSATION: 5,
    };
    const configService = {
      getOrThrow: jest.fn((key: string) => configValues[key]),
    };
    blockService = {
      validateBlockMany: jest.fn().mockResolvedValue(undefined),
    };
    gatewayService = {
      joinMembersToRoom: jest.fn().mockResolvedValue(undefined),
      leaveMembersFromRoom: jest.fn().mockResolvedValue(undefined),
      broadcastToConversation: jest.fn().mockResolvedValue(undefined),
    };

    service = new ConversationService(
      conversationRepo as unknown as ConversationRepository,
      jwtService as unknown as JwtService,
      configService as unknown as ConfigService,
      blockService as unknown as BlockService,
      gatewayService as unknown as GatewayService,
    );
  });

  describe('addMember', () => {
    const groupConversation = {
      id: 5,
      type: ConversationType.GROUP,
    } as never;

    it('forbids a plain member from adding others', async () => {
      conversationRepo.findConversationById.mockResolvedValue(
        groupConversation,
      );
      conversationRepo.findMembership.mockResolvedValue({
        role: ConversationMemberRole.MEMBER,
      });

      await expect(service.addMember(1, 5, 'bob')).rejects.toBeInstanceOf(
        ChatMemberForbiddenException,
      );
    });

    it('rejects adding a non-group conversation', async () => {
      conversationRepo.findConversationById.mockResolvedValue({
        id: 5,
        type: ConversationType.DIRECT,
      } as never);
      conversationRepo.findMembership.mockResolvedValue({
        role: ConversationMemberRole.ADMIN,
      });

      await expect(service.addMember(1, 5, 'bob')).rejects.toBeInstanceOf(
        ChatMemberNotAGroupException,
      );
    });

    it('lets an admin add a new member', async () => {
      conversationRepo.findConversationById.mockResolvedValue(
        groupConversation,
      );
      // First membership lookup = actor (admin); second = target (not yet member).
      conversationRepo.findMembership
        .mockResolvedValueOnce({
          role: ConversationMemberRole.ADMIN,
        })
        .mockResolvedValueOnce(null);
      conversationRepo.findUserByUsername.mockResolvedValue({
        id: 9,
        username: 'bob',
        displayName: 'Bob',
      } as never);

      const result = await service.addMember(1, 5, 'bob');

      expect(conversationRepo.addMemberToConversation).toHaveBeenCalledWith(5, {
        id: 9,
        username: 'bob',
        displayName: 'Bob',
      });
      expect(result.data).toMatchObject({
        conversationId: 5,
        member: { id: 9, username: 'bob' },
      });
    });

    it('rejects adding someone who is already a member', async () => {
      conversationRepo.findConversationById.mockResolvedValue(
        groupConversation,
      );
      conversationRepo.findMembership
        .mockResolvedValueOnce({
          role: ConversationMemberRole.ADMIN,
        })
        .mockResolvedValueOnce({ role: ConversationMemberRole.MEMBER });
      conversationRepo.findUserByUsername.mockResolvedValue({
        id: 9,
        username: 'bob',
        displayName: 'Bob',
      } as never);

      await expect(service.addMember(1, 5, 'bob')).rejects.toBeInstanceOf(
        ChatMemberAlreadyMemberException,
      );
      expect(conversationRepo.addMemberToConversation).not.toHaveBeenCalled();
    });
  });

  describe('setConversationPinned', () => {
    it('throws NotFound when the conversation is missing or the requester is not a member', async () => {
      // findMembership returns null for both cases, so both surface as 404.
      conversationRepo.findMembership.mockResolvedValue(null);
      await expect(
        service.setConversationPinned(1, 99, true),
      ).rejects.toBeInstanceOf(ChatPinConversationNotFoundException);
      expect(conversationRepo.setMembershipPinned).not.toHaveBeenCalled();
    });

    it('pins the conversation for the requester only', async () => {
      conversationRepo.findMembership.mockResolvedValue({
        role: ConversationMemberRole.MEMBER,
      });

      const result = await service.setConversationPinned(1, 5, true);

      expect(conversationRepo.setMembershipPinned).toHaveBeenCalledWith(
        5,
        1,
        true,
      );
      expect(result.data).toEqual({ conversationId: 5, pinned: true });
    });

    it('rejects pinning once the requester is at the pin limit', async () => {
      conversationRepo.findMembership.mockResolvedValue({
        role: ConversationMemberRole.MEMBER,
        pinned: false,
      });
      // Config mock caps pins at 5.
      conversationRepo.countPinnedConversations.mockResolvedValue(5);

      await expect(
        service.setConversationPinned(1, 5, true),
      ).rejects.toBeInstanceOf(ChatPinPinLimitExceededException);
      expect(conversationRepo.setMembershipPinned).not.toHaveBeenCalled();
    });

    it('does not count toward the limit when re-pinning an already pinned conversation', async () => {
      conversationRepo.findMembership.mockResolvedValue({
        role: ConversationMemberRole.MEMBER,
        pinned: true,
      });

      await service.setConversationPinned(1, 5, true);

      expect(conversationRepo.countPinnedConversations).not.toHaveBeenCalled();
      expect(conversationRepo.setMembershipPinned).toHaveBeenCalledWith(
        5,
        1,
        true,
      );
    });

    it('unpins the conversation for the requester only', async () => {
      conversationRepo.findMembership.mockResolvedValue({
        role: ConversationMemberRole.MEMBER,
      });

      const result = await service.setConversationPinned(1, 5, false);

      expect(conversationRepo.setMembershipPinned).toHaveBeenCalledWith(
        5,
        1,
        false,
      );
      expect(result.data).toEqual({ conversationId: 5, pinned: false });
    });
  });

  describe('listConversations', () => {
    it('signs a cursor with the last message id when a full page is returned', async () => {
      // The page size is forced to CHAT_PAGE_LIMIT (20 in the config mock), so a
      // "full" page must return exactly that many rows for a cursor to be issued.
      const page = Array.from({ length: 20 }, (_, index) => ({
        id: index + 1,
        type: ConversationType.DIRECT,
        name: '',
        pinned: false,
        members: [],
        lastMessage: { id: 100 + index } as never,
      }));
      conversationRepo.findConversationsPage.mockResolvedValue(page);

      const result = await service.listConversations(1, undefined);

      expect(jwtService.signAsync).toHaveBeenCalledWith({
        lastMessageId: 119,
      });
      expect(result.data?.cursor).toBe('SIGNED_CURSOR');
    });

    it('rejects a cursor missing the last message id with BadRequest', async () => {
      jwtService.verifyAsync.mockResolvedValue({ pinned: true } as never);
      await expect(
        service.listConversations(1, 'OLD_CURSOR'),
      ).rejects.toBeInstanceOf(ChatListConversationsCursorInvalidException);
    });
  });
});
