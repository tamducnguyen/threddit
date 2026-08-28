import { ChatSummarizeConversationNotFoundException } from '../../common/exception';
import { ConversationInsightsService } from './conversation-insights.service';
import { MessageRepository } from './message.repository';
import { ConversationRepository } from '../conversation/conversation.repository';
import { RagService } from '../rag/rag.service';
import { ConversationMemberRole } from '../../enum/conversation-member-role.enum';

/**
 * Unit tests for ConversationInsightsService's authorization + RAG delegation
 * logic. The repositories and RagService are fully mocked.
 */
describe('ConversationInsightsService', () => {
  let service: ConversationInsightsService;
  let messageRepo: Record<string, jest.Mock>;
  let conversationRepo: Record<string, jest.Mock>;
  let ragService: Record<string, jest.Mock>;

  beforeEach(() => {
    messageRepo = {
      findConversationMessagesForRag: jest.fn(),
      findUnreadMessagesForRag: jest.fn(),
    };
    conversationRepo = {
      findMembership: jest.fn(),
    };
    ragService = {
      summarizeConversation: jest.fn(),
      detectTopics: jest.fn(),
    };

    service = new ConversationInsightsService(
      messageRepo as unknown as MessageRepository,
      conversationRepo as unknown as ConversationRepository,
      ragService as unknown as RagService,
    );
  });

  describe('summarizeConversation', () => {
    it('throws NotFound when the conversation is missing or the requester is not a member', async () => {
      // findMembership returns null for both cases, so both surface as 404.
      conversationRepo.findMembership.mockResolvedValue(null);
      await expect(
        service.summarizeConversation(1, 99, 'project progress'),
      ).rejects.toBeInstanceOf(ChatSummarizeConversationNotFoundException);
      expect(ragService.summarizeConversation).not.toHaveBeenCalled();
    });

    it('delegates whole-conversation messages to RagService for a member', async () => {
      conversationRepo.findMembership.mockResolvedValue({
        role: ConversationMemberRole.MEMBER,
      });
      messageRepo.findConversationMessagesForRag.mockResolvedValue([
        { sender: 'a', text: 'hi', isRevoked: false, createdAt: new Date() },
      ]);
      ragService.summarizeConversation.mockResolvedValue({
        summary: 'Summary.',
        retrievedChunkCount: 3,
      });

      const result = await service.summarizeConversation(
        1,
        5,
        'project progress',
      );

      expect(messageRepo.findConversationMessagesForRag).toHaveBeenCalledWith(5);
      expect(messageRepo.findUnreadMessagesForRag).not.toHaveBeenCalled();
      expect(ragService.summarizeConversation).toHaveBeenCalledWith(
        5,
        'project progress',
        expect.any(Array),
      );
      expect(result.data).toMatchObject({
        conversationId: 5,
        topic: 'project progress',
        summary: 'Summary.',
        retrievedChunkCount: 3,
      });
    });
  });

  describe('detectTopics', () => {
    it('detects topics from unread messages only', async () => {
      conversationRepo.findMembership.mockResolvedValue({
        role: ConversationMemberRole.MEMBER,
      });
      messageRepo.findUnreadMessagesForRag.mockResolvedValue([
        {
          sender: 'a',
          text: 'new update',
          isRevoked: false,
          createdAt: new Date(),
        },
      ]);
      ragService.detectTopics.mockResolvedValue(['project progress']);

      const result = await service.detectTopics(1, 5);

      expect(messageRepo.findUnreadMessagesForRag).toHaveBeenCalledWith(5, 1);
      expect(messageRepo.findConversationMessagesForRag).not.toHaveBeenCalled();
      expect(ragService.detectTopics).toHaveBeenCalledWith(expect.any(Array));
      expect(result.data).toMatchObject({
        conversationId: 5,
        topics: ['project progress'],
      });
    });
  });
});
