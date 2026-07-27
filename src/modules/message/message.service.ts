import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  MessageRepository,
  MessageHistoryCursor,
  MessageSearchCursor,
} from './message.repository';
import { ConversationRepository } from '../conversation/conversation.repository';
import { ConversationService } from '../conversation/conversation.service';
import { StorageService } from '../storage/storage.service';
import {
  JobNotificationQueue,
  NameNotificationQueue,
} from '../notification/helper/notification.helper';
import { SendMessageDTO } from './dtos/send-message.dto';
import { sendResponse } from '../../common/helper/response.helper';
import { message } from '../../common/helper/message.helper';
import { decodeCursor } from '../../common/helper/cursor.helper';
import {
  ChatSendMessageInvalidTargetException,
  ChatSendMessageTextOrMediaRequiredException,
  ChatGetMessagesConversationNotFoundException,
  ChatGetMessagesCursorInvalidException,
  ChatRevokeMessageNotFoundException,
  ChatRevokeMessageForbiddenException,
  ChatReactMessageNotFoundException,
  ChatReactMessageNotAMemberException,
  ChatEditMessageNotFoundException,
  ChatEditMessageForbiddenException,
  ChatEditMessageRevokedException,
  ChatEditMessageTextRequiredException,
  ChatPinMessageNotFoundException,
  ChatPinMessageForbiddenException,
  ChatPinMessageLimitExceededException,
  ChatPinMessageNotAMemberException,
  ChatSearchMessagesConversationNotFoundException,
  ChatSearchMessagesCursorInvalidException,
} from '../../common/exception';
import { MediaTargetType } from 'src/enum/media-target-type.enum';
import { ConversationType } from 'src/enum/conversation-type.enum';
import { ConversationMemberRole } from 'src/enum/conversation-member-role.enum';
import { ReactionType } from 'src/enum/reactiontype.enum';
import { SentMessage } from './interfaces/sentmessage.interface';
import { ReactionCount } from './interfaces/reaction-count.interface';

@Injectable()
export class MessageService {
  private readonly messageLimit: number;
  private readonly maxPinnedMessagesPerConversation: number;
  private readonly logger = new Logger(MessageService.name);

  constructor(
    private readonly messageRepo: MessageRepository,
    private readonly conversationRepo: ConversationRepository,
    private readonly conversationService: ConversationService,
    private readonly storageService: StorageService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectQueue(NameNotificationQueue)
    private readonly notificationQueue: Queue,
  ) {
    this.messageLimit = this.configService.getOrThrow('MESSAGE_LIMIT');
    this.maxPinnedMessagesPerConversation = this.configService.getOrThrow(
      'MAX_PINNED_MESSAGES_PER_CONVERSATION',
    );
  }

  /**
   * Persist a new message for `senderId` and return the broadcast payload plus
   * the ids of every conversation member that should receive it.
   *
   * The DTO must target exactly one of:
   * - `username`: a direct chat, reusing or creating the direct conversation.
   * - `conversationId`: an existing conversation the sender is a member of.
   */
  async sendMessage(
    senderId: number,
    sendMessageDTO: SendMessageDTO,
  ): Promise<{
    sentMessage: SentMessage;
    memberIds: number[];
    isNewConversation: boolean;
  }> {
    const { username, conversationId, text, uploadSessionId } = sendMessageDTO;

    // Exactly one target is required: a username or an existing conversation id.
    if ((username && conversationId) || (!username && !conversationId)) {
      throw new ChatSendMessageInvalidTargetException();
    }

    // Resolve uploaded media keys from the upload session before persisting.
    const mediaKeys =
      await this.storageService.validateAndResolveMediaKeysFromUploadSession(
        senderId,
        uploadSessionId,
      );
    const normalizedText = text?.trim() ?? '';
    const hasText = normalizedText.length > 0;
    const hasMedia = mediaKeys.length > 0;

    // A message must carry at least one of text or media.
    if (!hasText && !hasMedia) {
      throw new ChatSendMessageTextOrMediaRequiredException();
    }

    // Resolve the sender and target conversation from the chosen target type.
    const { sender, conversation, memberIds, isNewConversation } = username
      ? await this.conversationService.resolveDirectConversation(
          senderId,
          username,
        )
      : await this.conversationService.resolveConversationForMember(
          senderId,
          conversationId!,
        );

    // Persist the message first so its id can seed permanent media keys.
    const createdMessage = await this.messageRepo.createMessage({
      sender,
      conversation,
      text: hasText ? normalizedText : null,
      replyToMessageId: sendMessageDTO.replyToMessageId,
    });

    // Attach uploaded media and mark the conversation's latest message;
    // a failure in either step must roll back the new message so the
    // caller's error response matches what's actually persisted.
    try {
      await this.storageService.attachUploadedMedia({
        ownerId: senderId,
        targetType: MediaTargetType.MESSAGE,
        targetId: createdMessage.id,
        mediaKeys,
        persist: (entities) => this.messageRepo.insertMessageMedias(entities),
      });
      await this.conversationRepo.updateConversationLastMessage(
        conversation.id,
        createdMessage.id,
      );
    } catch (error) {
      await this.messageRepo.deleteMessageById(createdMessage.id);
      throw error;
    }

    // Mention validation is membership-gated (not friendship-gated like the
    // content/comment mention precedent), since a chat can include people who
    // aren't friends. A username that isn't a current member is silently
    // dropped rather than rejecting the whole send.
    const mentionedUsernames = sendMessageDTO.mentionedUsers ?? [];
    if (mentionedUsernames.length > 0) {
      const memberIdSet = new Set(memberIds);
      const mentionedUsers = (
        await this.conversationRepo.findUsersByUsernames(mentionedUsernames)
      ).filter((user) => memberIdSet.has(user.id) && user.id !== senderId);

      if (mentionedUsers.length > 0) {
        await this.messageRepo.insertMessageMentions(
          createdMessage.id,
          mentionedUsers.map((user) => user.id),
        );
        this.notificationQueue
          .add(
            JobNotificationQueue.MENTION_IN_MESSAGE,
            {
              actorId: senderId,
              conversationId: conversation.id,
              messageId: createdMessage.id,
              mentionedUsers,
            },
            { priority: 2 },
          )
          .catch((error) => {
            this.logger.error(
              `Failed to enqueue mention notification for message ${createdMessage.id}`,
              error instanceof Error ? error.stack : String(error),
            );
          });
      }
    }

    // New-message notification for every other member.
    this.notificationQueue
      .add(
        JobNotificationQueue.NEW_MESSAGE,
        {
          senderId,
          memberIds,
          conversationId: conversation.id,
          messageId: createdMessage.id,
        },
        { priority: 2 },
      )
      .catch((error) => {
        this.logger.error(
          `Failed to enqueue new-message notification for message ${createdMessage.id}`,
          error instanceof Error ? error.stack : String(error),
        );
      });

    // Single round-trip that joins users / conversations / media files and
    // builds URLs via SQL CONCAT, so the row comes back already shaped.
    const sentMessage = await this.messageRepo.findSentMessageById(
      createdMessage.id,
    );

    return { sentMessage: sentMessage!, memberIds, isNewConversation };
  }

  /**
   * One page of a conversation's history, newest-first. Membership is required;
   * a missing conversation and a non-member both surface as 404 so history never
   * reveals whether a conversation the requester can't see exists.
   */
  async getMessages(
    requesterId: number,
    conversationId: number,
    cursor?: string,
  ) {
    const limit = this.messageLimit;
    const membership = await this.conversationRepo.findMembership(
      conversationId,
      requesterId,
    );
    if (!membership) {
      throw new ChatGetMessagesConversationNotFoundException();
    }

    const decoded = await decodeCursor<MessageHistoryCursor>(
      this.jwtService,
      cursor,
      ChatGetMessagesCursorInvalidException,
      (payload: MessageHistoryCursor) => typeof payload.id === 'number',
    );

    const items = await this.messageRepo.findMessagesPage(
      conversationId,
      decoded,
    );

    const nextCursor =
      items.length === limit
        ? await this.jwtService.signAsync(this.toMessageCursor(items))
        : null;

    return sendResponse(HttpStatus.OK, message.chat.get_messages.success, {
      items,
      cursor: nextCursor,
    });
  }

  /**
   * Soft-revoke a message. Only the original sender may revoke their own
   * message. Returns the ids for the gateway to broadcast.
   */
  async revokeMessage(requesterId: number, messageId: number) {
    const context = await this.messageRepo.findMessageContext(messageId);
    if (!context || context.conversationId === null) {
      throw new ChatRevokeMessageNotFoundException();
    }

    if (context.senderId !== requesterId) {
      throw new ChatRevokeMessageForbiddenException();
    }

    if (!context.isRevoked) {
      await this.messageRepo.revokeMessageById(messageId);
    }
    return { messageId, conversationId: context.conversationId };
  }

  /**
   * Edit a message's text. Only the original sender may edit, and a revoked
   * message can no longer be edited. Media attachments are out of scope for
   * v1 — only `text` is updated. Returns the ids + new text/editedAt for the
   * gateway to broadcast.
   */
  async editMessage(requesterId: number, messageId: number, text: string) {
    const context = await this.messageRepo.findMessageContext(messageId);
    if (!context || context.conversationId === null) {
      throw new ChatEditMessageNotFoundException();
    }
    if (context.senderId !== requesterId) {
      throw new ChatEditMessageForbiddenException();
    }
    if (context.isRevoked) {
      throw new ChatEditMessageRevokedException();
    }

    const normalizedText = text.trim();
    if (normalizedText.length === 0) {
      throw new ChatEditMessageTextRequiredException();
    }

    const editedAt = await this.messageRepo.editMessageById(
      messageId,
      normalizedText,
    );
    return {
      messageId,
      conversationId: context.conversationId,
      text: normalizedText,
      editedAt,
    };
  }

  /**
   * Add or change the requester's reaction on a message (upsert). Membership in
   * the conversation is required. Returns the conversation id and the fresh
   * aggregated counts for the gateway to broadcast.
   */
  async setMessageReaction(
    userId: number,
    messageId: number,
    type: ReactionType,
  ): Promise<{ conversationId: number; reactions: ReactionCount[] }> {
    const conversationId = await this.assertMessageReactable(userId, messageId);

    const existing = await this.messageRepo.findMessageReactionByUser(
      messageId,
      userId,
    );
    if (!existing) {
      await this.messageRepo.insertMessageReaction(messageId, userId, type);
    } else if (existing.type !== type) {
      await this.messageRepo.updateMessageReactionType(existing.id, type);
    }

    const reactions =
      await this.messageRepo.getMessageReactionCounts(messageId);
    return { conversationId, reactions };
  }

  /** Remove the requester's reaction from a message. */
  async removeMessageReaction(
    userId: number,
    messageId: number,
  ): Promise<{ conversationId: number; reactions: ReactionCount[] }> {
    const conversationId = await this.assertMessageReactable(userId, messageId);
    await this.messageRepo.deleteMessageReaction(messageId, userId);
    const reactions =
      await this.messageRepo.getMessageReactionCounts(messageId);
    return { conversationId, reactions };
  }

  /**
   * Pin or unpin a message (a global flag, not per-user). In a GROUP
   * conversation only the ADMIN may pin/unpin; in a DIRECT conversation
   * either member may, since there's no admin concept there. Idempotent
   * both ways; the per-conversation limit is only checked on pin.
   */
  async setMessagePinned(actorId: number, messageId: number, pinned: boolean) {
    const context = await this.messageRepo.findMessageContext(messageId);
    if (!context || context.conversationId === null) {
      throw new ChatPinMessageNotFoundException();
    }

    const membership = await this.conversationRepo.findMembership(
      context.conversationId,
      actorId,
    );
    if (!membership) {
      throw new ChatPinMessageNotAMemberException();
    }
    if (
      context.conversationType === ConversationType.GROUP &&
      membership.role !== ConversationMemberRole.ADMIN
    ) {
      throw new ChatPinMessageForbiddenException();
    }

    if (pinned) {
      const pinnedCount = await this.messageRepo.countPinnedMessages(
        context.conversationId,
      );
      if (pinnedCount >= this.maxPinnedMessagesPerConversation) {
        throw new ChatPinMessageLimitExceededException();
      }
    }

    await this.messageRepo.setMessagePinned(messageId, pinned);
    return { messageId, conversationId: context.conversationId, pinned };
  }

  /** Every currently-pinned message in a conversation the requester belongs to. */
  async getPinnedMessages(requesterId: number, conversationId: number) {
    const membership = await this.conversationRepo.findMembership(
      conversationId,
      requesterId,
    );
    if (!membership) {
      throw new ChatPinMessageNotAMemberException();
    }
    return await this.messageRepo.findPinnedMessages(conversationId);
  }

  /**
   * Search a conversation's non-revoked messages by substring, newest-first.
   * Membership is required, same 404-for-both pattern as `getMessages`.
   * Scoped to a single conversation (no cross-conversation search).
   */
  async searchMessages(
    requesterId: number,
    conversationId: number,
    key: string,
    cursor?: string,
  ) {
    const limit = this.messageLimit;
    const membership = await this.conversationRepo.findMembership(
      conversationId,
      requesterId,
    );
    if (!membership) {
      throw new ChatSearchMessagesConversationNotFoundException();
    }

    const decoded = await decodeCursor<MessageSearchCursor>(
      this.jwtService,
      cursor,
      ChatSearchMessagesCursorInvalidException,
      (payload: MessageSearchCursor) =>
        typeof payload.id === 'number' && typeof payload.createdAt === 'string',
    );

    const items = await this.messageRepo.searchMessages(
      conversationId,
      key,
      decoded,
      limit,
    );

    const nextCursor =
      items.length === limit
        ? await this.jwtService.signAsync({
            id: items[items.length - 1].id,
            createdAt: items[items.length - 1].createdAt,
          })
        : null;

    return sendResponse(HttpStatus.OK, message.chat.search_messages.success, {
      items,
      cursor: nextCursor,
    });
  }

  /**
   * Who has read up to and including this message. Reuses the existing
   * per-member `lastReadMessageId` pointer (no dedicated read-receipt table).
   * Membership is required, same gate as reacting to a message.
   */
  async getMessageReadReceipts(userId: number, messageId: number) {
    const conversationId = await this.assertMessageReactable(userId, messageId);
    const readers = await this.conversationRepo.findReadersOfMessage(
      conversationId,
      messageId,
    );
    return { conversationId, readers };
  }

  // --- internal helpers ---

  /** Resolve a message + verify the requester may react (is a member). */
  private async assertMessageReactable(
    userId: number,
    messageId: number,
  ): Promise<number> {
    const context = await this.messageRepo.findMessageContext(messageId);
    if (!context || context.conversationId === null) {
      throw new ChatReactMessageNotFoundException();
    }
    const membership = await this.conversationRepo.findMembership(
      context.conversationId,
      userId,
    );
    if (!membership) {
      throw new ChatReactMessageNotAMemberException();
    }
    return context.conversationId;
  }

  /** Build the next-page cursor payload from the last item of a history page. */
  private toMessageCursor(items: Array<{ id: number }>): MessageHistoryCursor {
    return { id: items[items.length - 1].id };
  }
}
