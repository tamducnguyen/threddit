import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  ConversationRepository,
  ConversationInboxCursor,
} from './conversation.repository';
import { CreateGroupDTO } from './dtos/create-group.dto';
import { message } from '../../common/helper/message.helper';
import { chatEvent } from '../../common/helper/chat.helper';
import { decodeCursor } from '../../common/helper/cursor.helper';
import { ConvertMediaRelativePathToUrl } from '../../common/helper/media-url.helper';
import { ConversationType } from 'src/enum/conversation-type.enum';
import { ConversationMemberRole } from 'src/enum/conversation-member-role.enum';
import { BlockService } from '../block/block.service';
import { GatewayService } from '../gateway/gateway.service';
import { ConversationSummary } from './interfaces/conversation-summary.interface';
import {
  ChatPinConversationNotFoundException,
  ChatPinPinLimitExceededException,
  ChatCreateGroupUserNotFoundException,
  ChatCreateGroupMinMemberRequiredException,
  ChatMemberConversationNotFoundException,
  ChatMemberNotAGroupException,
  ChatMemberUserNotFoundException,
  ChatMemberForbiddenException,
  ChatMemberNotAMemberException,
  ChatMemberAlreadyMemberException,
  ChatMemberTargetNotAMemberException,
  ChatMarkReadConversationNotFoundException,
  ChatSendMessageUserNotFoundException,
  ChatSendMessageCantMessageSelfException,
  ChatSendMessageConversationNotFoundException,
  ChatListConversationsCursorInvalidException,
  ChatMemberCannotDemoteLastAdminException,
} from '../../common/exception';

@Injectable()
export class ConversationService {
  private readonly conversationLimit: number;
  private readonly maxPinnedConversations: number;

  constructor(
    private readonly conversationRepo: ConversationRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly blockService: BlockService,
    private readonly gatewayService: GatewayService,
  ) {
    this.conversationLimit = Number(
      this.configService.getOrThrow<number>('CONVERSATION_LIMIT'),
    );
    this.maxPinnedConversations = Number(
      this.configService.getOrThrow<number>('MAX_PINNED_CONVERSATION'),
    );
    // Inbox paging assumes a full first page captures every pinned conversation
    // (so cursors only ever resume inside the unpinned segment). Enforce that
    // invariant here rather than letting paging silently skip/duplicate rows.
    if (this.conversationLimit <= this.maxPinnedConversations) {
      throw new Error(
        `CONVERSATION_LIMIT (${this.conversationLimit}) must be greater than MAX_PINNED_CONVERSATIONS (${this.maxPinnedConversations})`,
      );
    }
  }

  /**
   * Resolve the direct conversation between the sender and the user identified
   * by `username`, creating it when the two have never chatted before. Used by
   * the message layer when sending into a direct chat.
   */
  async resolveDirectConversation(senderId: number, username: string) {
    const [sender, receiver] = await Promise.all([
      this.conversationRepo.findUserById(senderId),
      this.conversationRepo.findUserByUsername(username),
    ]);
    if (!sender || !receiver) {
      throw new ChatSendMessageUserNotFoundException();
    }
    if (sender.id === receiver.id) {
      throw new ChatSendMessageCantMessageSelfException();
    }

    // Re-validated on every send (not just once at conversation creation)
    // since a block can be created after the direct conversation exists.
    await this.blockService.validateBlock(sender.id, receiver.id);

    // Reuse the existing direct conversation, otherwise create a fresh one.
    const directKey = this.conversationRepo.buildDirectKey(
      sender.id,
      receiver.id,
    );
    const existingConversation =
      await this.conversationRepo.findDirectConversationByDirectKey(directKey);
    const conversation =
      existingConversation ??
      (await this.conversationRepo.createDirectConversation(sender, receiver));

    return {
      sender,
      conversation,
      memberIds: [sender.id, receiver.id],
      isNewConversation: !existingConversation,
    };
  }

  /**
   * Resolve an existing conversation and verify the sender belongs to it. Used
   * by the message layer when sending into a known conversation.
   */
  async resolveConversationForMember(senderId: number, conversationId: number) {
    const [sender, conversation] = await Promise.all([
      this.conversationRepo.findUserById(senderId),
      this.conversationRepo.findConversationForMember(conversationId, senderId),
    ]);
    if (!sender) {
      throw new ChatSendMessageUserNotFoundException();
    }
    if (!conversation) {
      throw new ChatSendMessageConversationNotFoundException();
    }

    const memberIds = await this.conversationRepo.findConversationMemberIds(
      conversation.id,
    );

    // Re-validated on every send: a block formed against any current member
    // after the group was created must also block the sender's messages,
    // consistent with createGroup's all-or-nothing block semantics.
    await this.blockService.validateBlockMany(
      senderId,
      memberIds.filter((id) => id !== senderId),
    );

    return { sender, conversation, memberIds, isNewConversation: false };
  }

  /** Conversation ids the user belongs to (used by the gateway to auto-join sockets on connect). */
  async findConversationIdsOfUser(userId: number) {
    return await this.conversationRepo.findConversationIdsOfUser(userId);
  }

  /** Every user sharing at least one conversation with the requester (presence default audience). */
  async findChatPartnerIds(userId: number) {
    return await this.conversationRepo.findChatPartnerIds(userId);
  }

  /** The requester's inbox, most-recent conversation first. */
  async listConversations(userId: number, cursor?: string) {
    const limit = this.conversationLimit;
    const decoded = await decodeCursor<ConversationInboxCursor>(
      this.jwtService,
      cursor,
      ChatListConversationsCursorInvalidException,
      (payload: ConversationInboxCursor) =>
        typeof payload.lastMessageId === 'number',
    );

    const items = await this.conversationRepo.findConversationsPage(
      userId,
      decoded,
    );

    let nextCursor: string | null = null;
    if (items.length === limit) {
      const last = items[items.length - 1];
      // Conversations with no messages sort last and have no usable cursor.
      if (last.lastMessage) {
        nextCursor = await this.jwtService.signAsync({
          lastMessageId: last.lastMessage.id,
        });
      }
    }

    return { kind: 'success', data: { items, cursor: nextCursor } };
  }

  /**
   * Search the requester's own inbox: GROUP conversations match by `name`,
   * DIRECT conversations match by the other member's username/displayName.
   * Same cursor/pagination shape as `listConversations`. Also surfaces
   * accepted friends matching `key` who have no conversation yet, so the
   * client can offer to start a new direct chat with them.
   */
  async searchConversations(userId: number, key: string, cursor?: string) {
    const limit = this.conversationLimit;
    const decoded = await decodeCursor<ConversationInboxCursor>(
      this.jwtService,
      cursor,
      ChatListConversationsCursorInvalidException,
      (payload: ConversationInboxCursor) =>
        typeof payload.lastMessageId === 'number',
    );

    const [items, friendsWithoutConversation] = await Promise.all([
      this.conversationRepo.searchConversationsPage(userId, key, decoded),
      this.conversationRepo.searchFriendsWithoutConversation(userId, key),
    ]);

    let nextCursor: string | null = null;
    if (items.length === limit) {
      const last = items[items.length - 1];
      if (last.lastMessage) {
        nextCursor = await this.jwtService.signAsync({
          lastMessageId: last.lastMessage.id,
        });
      }
    }

    return {
      kind: 'success',
      data: { items, cursor: nextCursor, friendsWithoutConversation },
    };
  }

  /** Aggregate unread-message count across the requester's entire inbox. */
  async getUnreadCount(userId: number) {
    const { totalUnreadMessages, unreadConversationCount } =
      await this.conversationRepo.countUnreadMessages(userId);
    return {
      kind: 'success',
      data: { totalUnreadMessages, unreadConversationCount },
    };
  }

  /**
   * Pin or unpin a conversation in the requester's own inbox (per-member flag,
   * invisible to other members). Membership is required; a missing conversation
   * and a non-member both surface as 404 so pinning never reveals whether a
   * conversation the requester can't see exists. Idempotent both ways.
   */
  async setConversationPinned(
    requesterId: number,
    conversationId: number,
    pinned: boolean,
  ) {
    const membership = await this.conversationRepo.findMembership(
      conversationId,
      requesterId,
    );
    if (!membership) {
      throw new ChatPinConversationNotFoundException();
    }

    if (pinned && !membership.pinned) {
      const pinnedCount =
        await this.conversationRepo.countPinnedConversations(requesterId);
      if (pinnedCount >= this.maxPinnedConversations) {
        throw new ChatPinPinLimitExceededException();
      }
    }

    await this.conversationRepo.setMembershipPinned(
      conversationId,
      requesterId,
      pinned,
    );

    return { kind: 'success', data: { conversationId, pinned } };
  }

  /** Create a GROUP conversation owned by the creator and seeded with members. */
  async createGroup(adminId: number, createGroupDTO: CreateGroupDTO) {
    const admin = await this.conversationRepo.findUserById(adminId);
    if (!admin) {
      throw new ChatCreateGroupUserNotFoundException();
    }

    const usernames = [...new Set(createGroupDTO.memberUsernames)].filter(
      (username) => username !== admin.username,
    );
    if (usernames.length < 2) {
      throw new ChatCreateGroupMinMemberRequiredException();
    }

    const members = await this.conversationRepo.findUsersByUsernames(usernames);
    if (members.length !== usernames.length) {
      throw new ChatCreateGroupUserNotFoundException();
    }

    // Reject the group if the admin has any block relationship, in either
    // direction, with an added member.
    await this.blockService.validateBlockMany(
      admin.id,
      members.map((member) => member.id),
    );

    const conversation = await this.conversationRepo.createGroupConversation(
      admin,
      createGroupDTO.name,
      members,
    );
    const memberIds = [admin.id, ...members.map((member) => member.id)];

    // Pull any online member sockets into the new room so they receive messages.
    await this.gatewayService.joinMembersToRoom(memberIds, conversation.id);

    // Same shape as an inbox item (ConversationSummary) so clients can reuse
    // one renderer for both "just created" and "loaded from inbox".
    const data: ConversationSummary = {
      id: conversation.id,
      type: conversation.type,
      name: conversation.name ?? '',
      pinned: false,
      myRole: ConversationMemberRole.ADMIN,
      unreadCount: 0,
      members: members.map((member) => ({
        id: member.id,
        username: member.username,
        displayName: member.displayName,
        avatarUrl: ConvertMediaRelativePathToUrl(
          this.configService,
          member.avatarRelativePath,
        ),
      })),
      lastMessage: null,
    };

    return { kind: 'success', data };
  }

  /** Add a member to a group. Only the ADMIN may add. */
  async addMember(actorId: number, conversationId: number, username: string) {
    const conversation = await this.assertGroupAndManager(
      actorId,
      conversationId,
    );

    const user = await this.conversationRepo.findUserByUsername(username);
    if (!user) {
      throw new ChatMemberUserNotFoundException();
    }

    const existing = await this.conversationRepo.findMembership(
      conversationId,
      user.id,
    );
    if (existing) {
      throw new ChatMemberAlreadyMemberException();
    }

    await this.conversationRepo.addMemberToConversation(conversationId, user);

    const memberPayload = {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
    };
    await this.gatewayService.joinMembersToRoom([user.id], conversationId, {
      event: chatEvent.MEMBER_ADDED,
      message: message.chat.member.add_success,
      data: { conversationId, member: memberPayload },
    });

    return {
      kind: 'success',
      data: { conversationId: conversation.id, member: memberPayload },
    };
  }

  /** Remove a member from a group. Only the ADMIN may remove members. */
  async removeMember(
    actorId: number,
    conversationId: number,
    targetUserId: number,
  ) {
    await this.assertGroupAndManager(actorId, conversationId);

    const targetMembership = await this.conversationRepo.findMembership(
      conversationId,
      targetUserId,
    );
    if (!targetMembership) {
      throw new ChatMemberTargetNotAMemberException();
    }
    await this.assertNotLastAdmin(conversationId, targetMembership.role);
    await this.conversationRepo.removeMemberFromConversation(
      conversationId,
      targetUserId,
    );
    await this.gatewayService.leaveMembersFromRoom(
      [targetUserId],
      conversationId,
      {
        event: chatEvent.MEMBER_REMOVED,
        message: message.chat.member.remove_success,
        data: { conversationId, userId: targetUserId },
      },
    );

    return {
      kind: 'success',
      data: { conversationId, userId: targetUserId },
    };
  }

  /** Leave a group. Any member, including the ADMIN, may leave. */
  async leaveGroup(actorId: number, conversationId: number) {
    const conversation =
      await this.conversationRepo.findConversationById(conversationId);
    if (!conversation) {
      throw new ChatMemberConversationNotFoundException();
    }
    if (conversation.type !== ConversationType.GROUP) {
      throw new ChatMemberNotAGroupException();
    }
    const membership = await this.conversationRepo.findMembership(
      conversationId,
      actorId,
    );
    if (!membership) {
      throw new ChatMemberNotAMemberException();
    }
    // The last ADMIN can't leave either, otherwise this guard would be
    // trivially bypassable by leaving instead of demoting/removing.
    await this.assertNotLastAdmin(conversationId, membership.role);
    await this.conversationRepo.removeMemberFromConversation(
      conversationId,
      actorId,
    );
    await this.gatewayService.leaveMembersFromRoom([actorId], conversationId, {
      event: chatEvent.MEMBER_REMOVED,
      message: message.chat.member.leave_success,
      data: { conversationId, userId: actorId },
    });

    return {
      kind: 'success',
      data: { conversationId, userId: actorId },
    };
  }

  /** Promote/demote a member's role. Only the ADMIN may change roles. */
  async changeMemberRole(
    actorId: number,
    conversationId: number,
    targetUserId: number,
    role: ConversationMemberRole,
  ) {
    await this.assertGroupAndManager(actorId, conversationId);

    const targetMembership = await this.conversationRepo.findMembership(
      conversationId,
      targetUserId,
    );
    if (!targetMembership) {
      throw new ChatMemberTargetNotAMemberException();
    }

    if (targetMembership.role !== role) {
      await this.assertNotLastAdmin(conversationId, targetMembership.role);
      await this.conversationRepo.setMemberRole(
        conversationId,
        targetUserId,
        role,
      );
    }

    await this.gatewayService.broadcastToConversation(
      conversationId,
      chatEvent.MEMBER_ROLE_CHANGED,
      message.chat.member.role_changed,
      { conversationId, userId: targetUserId, role },
    );

    return {
      kind: 'success',
      data: { conversationId, userId: targetUserId, role },
    };
  }

  /**
   * Advance the requester's read pointer for a conversation. A missing
   * conversation and a non-member both surface as 404. The pointer only moves
   * forward; older ids are silently ignored.
   */
  async markConversationRead(
    requesterId: number,
    conversationId: number,
    lastReadMessageId: number,
  ) {
    const membership = await this.conversationRepo.findMembership(
      conversationId,
      requesterId,
    );
    if (!membership) {
      throw new ChatMarkReadConversationNotFoundException();
    }
    await this.conversationRepo.markConversationRead(
      conversationId,
      requesterId,
      lastReadMessageId,
    );
    return {
      kind: 'success',
      data: { conversationId, lastReadMessageId },
    };
  }

  // --- internal helpers ---

  /** Verify the conversation is a group and the actor is its ADMIN. */
  private async assertGroupAndManager(actorId: number, conversationId: number) {
    const conversation =
      await this.conversationRepo.findConversationById(conversationId);
    if (!conversation) {
      throw new ChatMemberConversationNotFoundException();
    }
    if (conversation.type !== ConversationType.GROUP) {
      throw new ChatMemberNotAGroupException();
    }
    const membership = await this.conversationRepo.findMembership(
      conversationId,
      actorId,
    );
    if (!membership) {
      throw new ChatMemberNotAMemberException();
    }
    if (membership.role !== ConversationMemberRole.ADMIN) {
      throw new ChatMemberForbiddenException();
    }
    return conversation;
  }

  /**
   * Reject demoting/removing/leaving as an ADMIN when doing so would leave
   * the group with zero admins. A no-op for non-admin roles.
   */
  private async assertNotLastAdmin(
    conversationId: number,
    currentRole: ConversationMemberRole,
  ) {
    if (currentRole !== ConversationMemberRole.ADMIN) return;
    const adminCount = await this.conversationRepo.countAdmins(conversationId);
    if (adminCount <= 1) {
      throw new ChatMemberCannotDemoteLastAdminException();
    }
  }
}
