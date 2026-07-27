import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SessionGuard } from '../../common/guard/session.guard';
import { UserThrottlerGuard } from '../../common/guard/throttler.guard';
import { ResponseMessage } from '../../common/decorator/response-message.decorator';
import { message } from '../../common/helper/message.helper';
import { CurrentUser } from '../token/currentuser.decorator';
import { AuthUser } from '../token/authuser.interface';
import { MessageService } from './message.service';
import { ConversationInsightsService } from './conversation-insights.service';
import { ConversationIdDTO } from '../conversation/dtos/conversation-id.dto';
import { SummarizeDTO } from './dtos/summarize.dto';
import { CursorDTO } from 'src/common/dtos/cursor.dto';
import { MessageIdParamDTO } from './dtos/message-id-param.dto';
import { SearchMessageDTO } from './dtos/search-message.dto';

@Controller('conversation')
@UseGuards(SessionGuard, UserThrottlerGuard)
export class MessageController {
  constructor(
    private readonly messageService: MessageService,
    private readonly conversationInsightsService: ConversationInsightsService,
  ) {}

  /** Paginated message history for a conversation the requester belongs to. */
  @Get(':conversationId/message')
  async getMessages(
    @CurrentUser() currentUser: AuthUser,
    @Param() conversationIdDTO: ConversationIdDTO,
    @Query() cursorDTO: CursorDTO,
  ) {
    return await this.messageService.getMessages(
      currentUser.sub,
      conversationIdDTO.conversationId,
      cursorDTO.cursor,
    );
  }

  /**
   * Who has read up to and including this message (members only). Reuses the
   * existing per-member read pointer rather than a dedicated receipts table.
   */
  @ResponseMessage({ success: message.chat.read_receipts.success })
  @Get('message/:messageId/read-by')
  async getMessageReadReceipts(
    @CurrentUser() currentUser: AuthUser,
    @Param() messageIdParamDTO: MessageIdParamDTO,
  ) {
    return await this.messageService.getMessageReadReceipts(
      currentUser.sub,
      messageIdParamDTO.messageId,
    );
  }

  /** Every currently-pinned message in a conversation (members only). */
  @ResponseMessage({ success: message.chat.pin_message.list_success })
  @Get(':conversationId/message/pinned')
  async getPinnedMessages(
    @CurrentUser() currentUser: AuthUser,
    @Param() conversationIdDTO: ConversationIdDTO,
  ) {
    const items = await this.messageService.getPinnedMessages(
      currentUser.sub,
      conversationIdDTO.conversationId,
    );
    return { kind: 'success', data: { items } };
  }

  /** Search a conversation's messages by substring (members only). */
  @Get(':conversationId/message/search')
  async searchMessages(
    @CurrentUser() currentUser: AuthUser,
    @Param() conversationIdDTO: ConversationIdDTO,
    @Query() searchMessageDTO: SearchMessageDTO,
  ) {
    return await this.messageService.searchMessages(
      currentUser.sub,
      conversationIdDTO.conversationId,
      searchMessageDTO.key,
      searchMessageDTO.cursor,
    );
  }

  /** RAG topic summary over the conversation's messages (members only). */
  @HttpCode(HttpStatus.OK)
  @Post(':conversationId/summarize')
  async summarize(
    @CurrentUser() currentUser: AuthUser,
    @Param() conversationIdDTO: ConversationIdDTO,
    @Body() summarizeDTO: SummarizeDTO,
  ) {
    return await this.conversationInsightsService.summarizeConversation(
      currentUser.sub,
      conversationIdDTO.conversationId,
      summarizeDTO.topic,
    );
  }

  /** Auto-detect discussion topics in the conversation (members only). */
  @Get(':conversationId/topics')
  async detectTopics(
    @CurrentUser() currentUser: AuthUser,
    @Param() conversationIdDTO: ConversationIdDTO,
  ) {
    return await this.conversationInsightsService.detectTopics(
      currentUser.sub,
      conversationIdDTO.conversationId,
    );
  }
}
