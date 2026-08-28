import { HttpStatus, Injectable } from '@nestjs/common';
import { MessageRepository } from './message.repository';
import { ConversationRepository } from '../conversation/conversation.repository';
import { RagService } from '../rag/rag.service';
import { sendResponse } from '../../common/helper/response.helper';
import { message } from '../../common/helper/message.helper';
import { ServiceExceptionClass } from '../../common/exception/base-service.exception';
import {
  ChatSummarizeConversationNotFoundException,
  ChatTopicsConversationNotFoundException,
} from '../../common/exception';

/**
 * AI-derived insights over a conversation's messages (summary, topics) — a
 * distinct concern from message CRUD, split out of `MessageService` so each
 * has a single reason to change.
 */
@Injectable()
export class ConversationInsightsService {
  constructor(
    private readonly messageRepo: MessageRepository,
    private readonly conversationRepo: ConversationRepository,
    private readonly ragService: RagService,
  ) {}

  /**
   * RAG topic summary for a conversation. Membership is required; a missing
   * conversation and a non-member both surface as 404. Summaries are generated
   * from the whole conversation, not the read pointer, so a prior topic-detect
   * or mark-read event cannot accidentally hide the context to summarize.
   */
  async summarizeConversation(
    requesterId: number,
    conversationId: number,
    topic: string,
  ) {
    await this.assertMember(
      requesterId,
      conversationId,
      ChatSummarizeConversationNotFoundException,
    );

    const messages =
      await this.messageRepo.findConversationMessagesForRag(conversationId);
    const { summary, retrievedChunkCount } =
      await this.ragService.summarizeConversation(
        conversationId,
        topic,
        messages,
      );

    return sendResponse(HttpStatus.OK, message.chat.summarize.success, {
      conversationId,
      topic,
      summary,
      retrievedChunkCount,
    });
  }

  /**
   * Detect the main discussion topics in unread messages. A missing
   * conversation and a non-member both surface as 404.
   */
  async detectTopics(requesterId: number, conversationId: number) {
    await this.assertMember(
      requesterId,
      conversationId,
      ChatTopicsConversationNotFoundException,
    );
    const messages = await this.messageRepo.findUnreadMessagesForRag(
      conversationId,
      requesterId,
    );
    const topics = await this.ragService.detectTopics(messages);
    return sendResponse(HttpStatus.OK, message.chat.topics.success, {
      conversationId,
      topics,
    });
  }

  /**
   * Verify the requester is a member of the conversation for a read action; a
   * missing conversation and a non-member both surface as 404.
   */
  private async assertMember(
    requesterId: number,
    conversationId: number,
    ConversationNotFoundException: ServiceExceptionClass,
  ): Promise<void> {
    const membership = await this.conversationRepo.findMembership(
      conversationId,
      requesterId,
    );
    if (!membership) {
      throw new ConversationNotFoundException();
    }
  }
}
