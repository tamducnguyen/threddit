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
      findMessagesForRag: jest.fn(),
    };
    conversationRepo = {
      findMembership: jest.fn(),
    };
    ragService = {
      summarizeConversation: jest.fn(),
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
        service.summarizeConversation(1, 99, 'tiến độ dự án'),
      ).rejects.toBeInstanceOf(ChatSummarizeConversationNotFoundException);
      expect(ragService.summarizeConversation).not.toHaveBeenCalled();
    });

    it('delegates to RagService and returns its summary for a member', async () => {
      conversationRepo.findMembership.mockResolvedValue({
        role: ConversationMemberRole.MEMBER,
      });
      messageRepo.findMessagesForRag.mockResolvedValue([
        { sender: 'a', text: 'hi', isRevoked: false, createdAt: new Date() },
      ]);
      ragService.summarizeConversation.mockResolvedValue({
        summary: 'Tóm tắt.',
        retrievedChunkCount: 3,
      });

      const result = await service.summarizeConversation(1, 5, 'tiến độ dự án');

      expect(ragService.summarizeConversation).toHaveBeenCalledWith(
        5,
        'tiến độ dự án',
        expect.any(Array),
      );
      expect(result.data).toMatchObject({
        conversationId: 5,
        topic: 'tiến độ dự án',
        summary: 'Tóm tắt.',
        retrievedChunkCount: 3,
      });
    });
  });
});
