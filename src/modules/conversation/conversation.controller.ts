import {
  Body,
  Controller,
  Delete,
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
import { ConversationService } from './conversation.service';
import { ConversationIdDTO } from './dtos/conversation-id.dto';
import { ConversationMemberParamDTO } from './dtos/conversation-member-param.dto';
import { CreateGroupDTO } from './dtos/create-group.dto';
import { AddMemberDTO } from './dtos/add-member.dto';
import { MarkReadDTO } from './dtos/mark-read.dto';
import { ChangeMemberRoleDTO } from './dtos/change-member-role.dto';
import { CursorDTO } from 'src/common/dtos/cursor.dto';
import { SearchConversationDTO } from './dtos/search-conversation.dto';

@Controller('conversation')
@UseGuards(SessionGuard, UserThrottlerGuard)
export class ConversationController {
  constructor(private readonly conversationService: ConversationService) {}

  /** List the requester's conversations (inbox), most-recent first. */
  @ResponseMessage({ success: message.chat.list_conversations.success })
  @HttpCode(HttpStatus.OK)
  @Get()
  async listConversations(
    @CurrentUser() currentUser: AuthUser,
    @Query() cursorDTO: CursorDTO,
  ) {
    return await this.conversationService.listConversations(
      currentUser.sub,
      cursorDTO.cursor,
    );
  }

  /**
   * Search the requester's own inbox: group conversations match by name,
   * direct conversations match by the other member's username/displayName.
   */
  @ResponseMessage({ success: message.chat.search_conversations.success })
  @HttpCode(HttpStatus.OK)
  @Get('search')
  async searchConversations(
    @CurrentUser() currentUser: AuthUser,
    @Query() searchDTO: SearchConversationDTO,
  ) {
    return await this.conversationService.searchConversations(
      currentUser.sub,
      searchDTO.key.trim(),
      searchDTO.cursor,
    );
  }

  /** Total unread-message count across the requester's entire inbox. */
  @ResponseMessage({ success: message.chat.unread_count.success })
  @HttpCode(HttpStatus.OK)
  @Get('unread-count')
  async getUnreadCount(@CurrentUser() currentUser: AuthUser) {
    return await this.conversationService.getUnreadCount(currentUser.sub);
  }

  /** Create a group conversation owned by the requester. */
  @ResponseMessage({ success: message.chat.create_group.success })
  @HttpCode(HttpStatus.CREATED)
  @Post('/group')
  async createGroup(
    @CurrentUser() currentUser: AuthUser,
    @Body() createGroupDTO: CreateGroupDTO,
  ) {
    return await this.conversationService.createGroup(
      currentUser.sub,
      createGroupDTO,
    );
  }

  /** Add a member to a group (ADMIN only). */
  @ResponseMessage({ success: message.chat.member.add_success })
  @HttpCode(HttpStatus.OK)
  @Post(':conversationId/members')
  async addMember(
    @CurrentUser() currentUser: AuthUser,
    @Param() conversationIdDTO: ConversationIdDTO,
    @Body() addMemberDTO: AddMemberDTO,
  ) {
    return await this.conversationService.addMember(
      currentUser.sub,
      conversationIdDTO.conversationId,
      addMemberDTO.username,
    );
  }

  /** Remove a member from a group (ADMIN only). */
  @ResponseMessage({ success: message.chat.member.remove_success })
  @HttpCode(HttpStatus.OK)
  @Delete(':conversationId/members/:userId')
  async removeMember(
    @CurrentUser() currentUser: AuthUser,
    @Param() params: ConversationMemberParamDTO,
  ) {
    return await this.conversationService.removeMember(
      currentUser.sub,
      params.conversationId,
      params.userId,
    );
  }

  /** Change a member's role in a group (ADMIN only, cannot demote the last admin). */
  @ResponseMessage({ success: message.chat.member.role_changed })
  @HttpCode(HttpStatus.OK)
  @Post(':conversationId/member/:userId/role')
  async changeMemberRole(
    @CurrentUser() currentUser: AuthUser,
    @Param() params: ConversationMemberParamDTO,
    @Body() changeMemberRoleDTO: ChangeMemberRoleDTO,
  ) {
    return await this.conversationService.changeMemberRole(
      currentUser.sub,
      params.conversationId,
      params.userId,
      changeMemberRoleDTO.role,
    );
  }

  /** Leave a group the requester belongs to (the last ADMIN cannot leave). */
  @ResponseMessage({ success: message.chat.member.leave_success })
  @HttpCode(HttpStatus.OK)
  @Delete(':conversationId/leave')
  async leaveGroup(
    @CurrentUser() currentUser: AuthUser,
    @Param() conversationIdDTO: ConversationIdDTO,
  ) {
    return await this.conversationService.leaveGroup(
      currentUser.sub,
      conversationIdDTO.conversationId,
    );
  }

  /** Pin a conversation to the top of the requester's inbox (members only). */
  @ResponseMessage({ success: message.chat.pin.pin_success })
  @HttpCode(HttpStatus.OK)
  @Post(':conversationId/pin')
  async pinConversation(
    @CurrentUser() currentUser: AuthUser,
    @Param() conversationIdDTO: ConversationIdDTO,
  ) {
    return await this.conversationService.setConversationPinned(
      currentUser.sub,
      conversationIdDTO.conversationId,
      true,
    );
  }

  /** Unpin a conversation from the requester's inbox (members only). */
  @ResponseMessage({ success: message.chat.pin.unpin_success })
  @HttpCode(HttpStatus.OK)
  @Delete(':conversationId/pin')
  async unpinConversation(
    @CurrentUser() currentUser: AuthUser,
    @Param() conversationIdDTO: ConversationIdDTO,
  ) {
    return await this.conversationService.setConversationPinned(
      currentUser.sub,
      conversationIdDTO.conversationId,
      false,
    );
  }

  /** Mark messages as read up to `lastReadMessageId` (per-member read pointer). */
  @ResponseMessage({ success: message.chat.mark_read.success })
  @HttpCode(HttpStatus.OK)
  @Post(':conversationId/read')
  async markRead(
    @CurrentUser() currentUser: AuthUser,
    @Param() conversationIdDTO: ConversationIdDTO,
    @Body() markReadDTO: MarkReadDTO,
  ) {
    return await this.conversationService.markConversationRead(
      currentUser.sub,
      conversationIdDTO.conversationId,
      markReadDTO.lastReadMessageId,
    );
  }
}
