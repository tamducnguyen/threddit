import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { ConversationEntity } from 'src/entities/conversation.entity';
import { MediaFileEntity } from 'src/entities/media-file.entity';
import { MessageEntity } from 'src/entities/message.entity';
import { MessageMentionEntity } from 'src/entities/message-mention.entity';
import { ReactionEntity } from 'src/entities/reaction.entity';
import { UserEntity } from 'src/entities/user.entity';
import { ConversationType } from 'src/enum/conversation-type.enum';
import { MediaTargetType } from 'src/enum/media-target-type.enum';
import { ReactionTargetType } from 'src/enum/reactiontargettype.enum';
import { ReactionType } from 'src/enum/reactiontype.enum';
import { DataSource, Repository } from 'typeorm';
import { MediaFile } from 'src/common/interface/media-file.interface';
import { MessageReply } from 'src/common/interface/message.interface';
import { UserWithId } from 'src/common/interface/user-with-id.interface';
import { Conversation } from '../conversation/interfaces/conversation.interface';
import { SentMessage } from './interfaces/sentmessage.interface';
import { HistoryMessage } from './interfaces/history-message.interface';
import { ReactionCount } from './interfaces/reaction-count.interface';

/** Opaque cursor payload for paging message history (newest-first). */
export interface MessageHistoryCursor {
  createdAt: Date;
  id: number;
}

/** Opaque cursor payload for paging search results (newest-first, chronological). */
export interface MessageSearchCursor {
  createdAt: string;
  id: number;
}

export interface RagMessageRow {
  sender: string;
  text: string | null;
  isRevoked: boolean;
  createdAt: Date;
}

export class MessageRepository {
  private readonly messageLimit: number;

  constructor(
    @InjectRepository(MessageEntity)
    private readonly messageRepo: Repository<MessageEntity>,
    @InjectRepository(MediaFileEntity)
    private readonly mediaFileRepo: Repository<MediaFileEntity>,
    @InjectRepository(ReactionEntity)
    private readonly reactionRepo: Repository<ReactionEntity>,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {
    this.messageLimit = this.configService.getOrThrow('MESSAGE_LIMIT');
  }

  async createMessage(input: {
    sender: UserEntity;
    conversation: ConversationEntity;
    text: string | null;
    replyToMessageId?: number;
  }) {
    const entity = this.messageRepo.create({
      sender: input.sender,
      conversation: input.conversation,
      text: input.text,
      ...(input.replyToMessageId
        ? { replyTo: { id: input.replyToMessageId } as MessageEntity }
        : {}),
    });
    return await this.messageRepo.save(entity);
  }

  async deleteMessageById(messageId: number) {
    await this.messageRepo.delete({ id: messageId });
  }

  /** Persist which users were @mentioned in a message (best-effort, no-op for empty lists). */
  async insertMessageMentions(messageId: number, userIds: number[]) {
    if (userIds.length === 0) return;
    await this.dataSource
      .createQueryBuilder()
      .insert()
      .into(MessageMentionEntity)
      .values(userIds.map((userId) => ({ messageId, userId })))
      .orIgnore()
      .execute();
  }

  async insertMessageMedias(mediaFiles: MediaFileEntity[]) {
    return await this.mediaFileRepo.save(mediaFiles);
  }

  /**
   * Returns the full SentMessage payload for a freshly persisted message by
   * joining users, conversations, and media files in a single round-trip.
   * URLs and JSON shaping are computed in SQL so the service can return the
   * row almost as-is.
   *
   * The conversation's `lastMessage` is set to this same message by the
   * caller (it was just persisted, so it is by definition the latest).
   */
  async findSentMessageById(messageId: number): Promise<SentMessage | null> {
    const storageUrl = this.configService.getOrThrow<string>('STORAGE_URL');
    const rows = await this.dataSource.query<
      Array<{
        id: number;
        text: string | null;
        createdAt: Date;
        editedAt: Date | null;
        sender: UserWithId;
        conversation: Omit<Conversation, 'lastMessage'>;
        mediaFiles: MediaFile[];
        replyTo: MessageReply | null;
        mentionedUsers: UserWithId[];
      }>
    >(
      `SELECT m.id,
              m.text,
              m.created_at AS "createdAt",
              m.edited_at AS "editedAt",
              json_build_object(
                'id', s.id,
                'username', s.username,
                'displayName', s.display_name,
                'avatarUrl', CONCAT($2::text, s.avatar_relative_path)
              ) AS sender,
              json_build_object(
                'id', c.id,
                'type', c.type,
                'name', COALESCE(c.name, '')
              ) AS conversation,
              COALESCE(
                (
                  SELECT json_agg(json_build_object(
                    'id', mf.id,
                    'type', mf.type,
                    'sortOrder', mf.sort_order,
                    'key', mf.relative_path,
                    'url', CONCAT($2::text, mf.relative_path)
                  ) ORDER BY mf.sort_order)
                  FROM media_files mf
                  WHERE mf.target_type = $3 AND mf.target_id = m.id
                ),
                '[]'::json
              ) AS "mediaFiles",
              CASE WHEN rm.id IS NULL THEN NULL ELSE json_build_object(
                'id', rm.id,
                'text', CASE WHEN rm.is_revoked THEN NULL ELSE rm.text END,
                'isRevoked', rm.is_revoked,
                'sender', json_build_object(
                  'id', rs.id,
                  'username', rs.username,
                  'displayName', rs.display_name,
                  'avatarUrl', CONCAT($2::text, rs.avatar_relative_path)
                )
              ) END AS "replyTo",
              COALESCE(
                (
                  SELECT json_agg(json_build_object(
                    'id', mu.id,
                    'username', mu.username,
                    'displayName', mu.display_name,
                    'avatarUrl', CONCAT($2::text, mu.avatar_relative_path)
                  ))
                  FROM message_mentions mm
                  INNER JOIN users mu ON mu.id = mm.user_id
                  WHERE mm.message_id = m.id
                ),
                '[]'::json
              ) AS "mentionedUsers"
         FROM messages m
         INNER JOIN users s ON s.id = m.sender_user_id
         INNER JOIN conversations c ON c.id = m.conversation_id
         LEFT JOIN messages rm ON rm.id = m.reply_to_message_id
         LEFT JOIN users rs ON rs.id = rm.sender_user_id
        WHERE m.id = $1`,
      [messageId, storageUrl, MediaTargetType.MESSAGE],
    );
    const row = rows[0];
    if (!row) return null;

    const messageShape = {
      id: row.id,
      text: row.text ?? undefined,
      createdAt: row.createdAt,
      editedAt: row.editedAt,
      sender: row.sender,
      mediaFiles: row.mediaFiles,
      replyTo: row.replyTo
        ? { ...row.replyTo, text: row.replyTo.text ?? undefined }
        : null,
      mentionedUsers: row.mentionedUsers,
    };
    return {
      ...messageShape,
      conversation: { ...row.conversation, lastMessage: messageShape },
    };
  }

  /** Sender + conversation context used to authorize revoke / reaction actions. */
  async findMessageContext(messageId: number): Promise<{
    id: number;
    senderId: number | null;
    conversationId: number | null;
    conversationType: ConversationType | null;
    isRevoked: boolean;
  } | null> {
    const rows = await this.dataSource.query<
      Array<{
        id: number;
        senderId: number | null;
        conversationId: number | null;
        conversationType: ConversationType | null;
        isRevoked: boolean;
      }>
    >(
      `SELECT m.id,
              m.sender_user_id AS "senderId",
              m.conversation_id AS "conversationId",
              m.is_revoked AS "isRevoked",
              c.type AS "conversationType"
         FROM messages m
         LEFT JOIN conversations c ON c.id = m.conversation_id
        WHERE m.id = $1`,
      [messageId],
    );
    return rows[0] ?? null;
  }

  async revokeMessageById(messageId: number) {
    await this.messageRepo.update({ id: messageId }, { isRevoked: true });
  }

  /** Count how many messages are currently pinned in a conversation. */
  async countPinnedMessages(conversationId: number): Promise<number> {
    const rows = await this.dataSource.query<Array<{ count: number }>>(
      `SELECT COUNT(*)::int AS count
         FROM messages
        WHERE conversation_id = $1 AND is_pinned = true`,
      [conversationId],
    );
    return rows[0]?.count ?? 0;
  }

  /** Set or clear a message's pin flag (global, not per-user). Idempotent both ways. */
  async setMessagePinned(messageId: number, pinned: boolean): Promise<void> {
    await this.messageRepo.update({ id: messageId }, { isPinned: pinned });
  }

  /** Every currently-pinned message in a conversation, newest-first. */
  async findPinnedMessages(conversationId: number): Promise<HistoryMessage[]> {
    const storageUrl = this.configService.getOrThrow<string>('STORAGE_URL');
    const rows = await this.dataSource.query<
      Array<{
        id: number;
        text: string | null;
        isRevoked: boolean;
        createdAt: Date;
        editedAt: Date | null;
        sender: UserWithId;
        mediaFiles: MediaFile[];
      }>
    >(
      `SELECT m.id,
              m.text,
              m.is_revoked AS "isRevoked",
              m.created_at AS "createdAt",
              m.edited_at AS "editedAt",
              json_build_object(
                'id', s.id,
                'username', s.username,
                'displayName', s.display_name,
                'avatarUrl', CONCAT($2::text, s.avatar_relative_path)
              ) AS sender,
              COALESCE(
                (
                  SELECT json_agg(json_build_object(
                    'id', mf.id,
                    'type', mf.type,
                    'sortOrder', mf.sort_order,
                    'key', mf.relative_path,
                    'url', CONCAT($2::text, mf.relative_path)
                  ) ORDER BY mf.sort_order)
                  FROM media_files mf
                  WHERE mf.target_type = $3 AND mf.target_id = m.id
                ),
                '[]'::json
              ) AS "mediaFiles"
         FROM messages m
         INNER JOIN users s ON s.id = m.sender_user_id
        WHERE m.conversation_id = $1 AND m.is_pinned = true
        ORDER BY m.created_at DESC, m.id DESC`,
      [conversationId, storageUrl, MediaTargetType.MESSAGE],
    );

    const reactionMap = await this.getReactionCountsForMessages(
      rows.map((row) => row.id),
    );

    return rows.map((row) => ({
      id: row.id,
      text: row.isRevoked ? undefined : (row.text ?? undefined),
      createdAt: row.createdAt,
      editedAt: row.editedAt,
      sender: row.sender,
      mediaFiles: row.isRevoked ? [] : row.mediaFiles,
      isRevoked: row.isRevoked,
      reactions: reactionMap.get(row.id) ?? [],
    }));
  }

  /** Update a message's text and stamp `editedAt`; returns the new timestamp. */
  async editMessageById(messageId: number, text: string): Promise<Date> {
    const rows = await this.dataSource.query<Array<{ editedAt: Date }>>(
      `UPDATE messages
          SET text = $2, edited_at = NOW()
        WHERE id = $1
        RETURNING edited_at AS "editedAt"`,
      [messageId, text],
    );
    return rows[0].editedAt;
  }

  /**
   * One page of a conversation's history, newest-first, cursor on
   * `(created_at, id)`. Returns up to `limit` rows shaped like `HistoryMessage`
   * (reaction counts attached separately); revoked messages have `text` nulled.
   */
  async findMessagesPage(
    conversationId: number,
    cursor: MessageHistoryCursor | undefined,
  ): Promise<HistoryMessage[]> {
    const storageUrl = this.configService.getOrThrow<string>('STORAGE_URL');
    const params: unknown[] = [
      conversationId,
      storageUrl,
      MediaTargetType.MESSAGE,
    ];
    let cursorClause = '';
    if (cursor) {
      params.push(cursor.createdAt, cursor.id);
      cursorClause = `
    AND (
      m.created_at < $4::timestamptz
      OR (
        m.created_at = $4::timestamptz
        AND m.id < $5::int
      )
    )
  `;
    }
    const limitParamIndex = params.length + 1;
    params.push(this.messageLimit);

    const rows = await this.dataSource.query<
      Array<{
        id: number;
        text: string | null;
        isRevoked: boolean;
        createdAt: Date;
        editedAt: Date | null;
        sender: UserWithId;
        mediaFiles: MediaFile[];
        replyTo: MessageReply | null;
        mentionedUsers: UserWithId[];
      }>
    >(
      `SELECT m.id,
              m.text,
              m.is_revoked AS "isRevoked",
              m.created_at AS "createdAt",
              m.edited_at AS "editedAt",
              json_build_object(
                'id', s.id,
                'username', s.username,
                'displayName', s.display_name,
                'avatarUrl', CONCAT($2::text, s.avatar_relative_path)
              ) AS sender,
              COALESCE(
                (
                  SELECT json_agg(json_build_object(
                    'id', mf.id,
                    'type', mf.type,
                    'sortOrder', mf.sort_order,
                    'key', mf.relative_path,
                    'url', CONCAT($2::text, mf.relative_path)
                  ) ORDER BY mf.sort_order)
                  FROM media_files mf
                  WHERE mf.target_type = $3 AND mf.target_id = m.id
                ),
                '[]'::json
              ) AS "mediaFiles",
              CASE WHEN rm.id IS NULL THEN NULL ELSE json_build_object(
                'id', rm.id,
                'text', CASE WHEN rm.is_revoked THEN NULL ELSE rm.text END,
                'isRevoked', rm.is_revoked,
                'sender', json_build_object(
                  'id', rs.id,
                  'username', rs.username,
                  'displayName', rs.display_name,
                  'avatarUrl', CONCAT($2::text, rs.avatar_relative_path)
                )
              ) END AS "replyTo",
              COALESCE(
                (
                  SELECT json_agg(json_build_object(
                    'id', mu.id,
                    'username', mu.username,
                    'displayName', mu.display_name,
                    'avatarUrl', CONCAT($2::text, mu.avatar_relative_path)
                  ))
                  FROM message_mentions mm
                  INNER JOIN users mu ON mu.id = mm.user_id
                  WHERE mm.message_id = m.id
                ),
                '[]'::json
              ) AS "mentionedUsers"
         FROM messages m
         INNER JOIN users s ON s.id = m.sender_user_id
         LEFT JOIN messages rm ON rm.id = m.reply_to_message_id
         LEFT JOIN users rs ON rs.id = rm.sender_user_id
        WHERE m.conversation_id = $1
          ${cursorClause}
        ORDER BY m.created_at DESC, m.id DESC
        LIMIT $${limitParamIndex}`,
      params,
    );

    const reactionMap = await this.getReactionCountsForMessages(
      rows.map((row) => row.id),
    );

    return rows.map((row) => ({
      id: row.id,
      text: row.isRevoked ? undefined : (row.text ?? undefined),
      createdAt: row.createdAt,
      editedAt: row.editedAt,
      sender: row.sender,
      mediaFiles: row.isRevoked ? [] : row.mediaFiles,
      isRevoked: row.isRevoked,
      reactions: reactionMap.get(row.id) ?? [],
      replyTo: row.replyTo
        ? { ...row.replyTo, text: row.replyTo.text ?? undefined }
        : null,
      mentionedUsers: row.mentionedUsers,
    }));
  }

  /**
   * Search a conversation's non-revoked messages by substring, newest-first,
   * cursor on `(created_at, id)`. Scoped to a single conversation per the
   * chosen product scope (no cross-conversation search).
   */
  async searchMessages(
    conversationId: number,
    key: string,
    cursor: MessageSearchCursor | undefined,
    limit: number,
  ): Promise<HistoryMessage[]> {
    const storageUrl = this.configService.getOrThrow<string>('STORAGE_URL');
    const params: unknown[] = [
      conversationId,
      storageUrl,
      MediaTargetType.MESSAGE,
      `%${key}%`,
    ];
    let cursorClause = '';
    if (cursor) {
      params.push(cursor.createdAt, cursor.id);
      cursorClause = `AND (m.created_at, m.id) < ($5::timestamptz, $6::int)`;
    }
    const limitParamIndex = params.length + 1;
    params.push(limit);

    const rows = await this.dataSource.query<
      Array<{
        id: number;
        text: string | null;
        isRevoked: boolean;
        createdAt: Date;
        editedAt: Date | null;
        sender: UserWithId;
        mediaFiles: MediaFile[];
      }>
    >(
      `SELECT m.id,
              m.text,
              m.is_revoked AS "isRevoked",
              m.created_at AS "createdAt",
              m.edited_at AS "editedAt",
              json_build_object(
                'id', s.id,
                'username', s.username,
                'displayName', s.display_name,
                'avatarUrl', CONCAT($2::text, s.avatar_relative_path)
              ) AS sender,
              COALESCE(
                (
                  SELECT json_agg(json_build_object(
                    'id', mf.id,
                    'type', mf.type,
                    'sortOrder', mf.sort_order,
                    'key', mf.relative_path,
                    'url', CONCAT($2::text, mf.relative_path)
                  ) ORDER BY mf.sort_order)
                  FROM media_files mf
                  WHERE mf.target_type = $3 AND mf.target_id = m.id
                ),
                '[]'::json
              ) AS "mediaFiles"
         FROM messages m
         INNER JOIN users s ON s.id = m.sender_user_id
        WHERE m.conversation_id = $1
          AND m.is_revoked = false
          AND m.text ILIKE $4
          ${cursorClause}
        ORDER BY m.created_at DESC, m.id DESC
        LIMIT $${limitParamIndex}`,
      params,
    );

    const reactionMap = await this.getReactionCountsForMessages(
      rows.map((row) => row.id),
    );

    return rows.map((row) => ({
      id: row.id,
      text: row.text ?? undefined,
      createdAt: row.createdAt,
      editedAt: row.editedAt,
      sender: row.sender,
      mediaFiles: row.mediaFiles,
      isRevoked: row.isRevoked,
      reactions: reactionMap.get(row.id) ?? [],
    }));
  }

  /**
   * A conversation's messages that `userId` has not yet read, in chronological
   * order, shaped for the RAG pipeline. "Unread" is everything newer than the
   * member's read pointer (`last_read_message_id`), matching the unread-count
   * rule used by the inbox. Revoked / null-text rows are kept here and filtered
   * downstream by the preprocessor so this stays a plain dump.
   */
  async findConversationMessagesForRag(
    conversationId: number,
  ): Promise<RagMessageRow[]> {
    return await this.dataSource.query(
      `SELECT s.display_name AS sender,
              m.text,
              m.is_revoked AS "isRevoked",
              m.created_at AS "createdAt"
         FROM messages m
         INNER JOIN users s ON s.id = m.sender_user_id
        WHERE m.conversation_id = $1
        ORDER BY m.id ASC`,
      [conversationId],
    );
  }

  async findUnreadMessagesForRag(
    conversationId: number,
    userId: number,
  ): Promise<RagMessageRow[]> {
    return await this.dataSource.query(
      `SELECT s.display_name AS sender,
              m.text,
              m.is_revoked AS "isRevoked",
              m.created_at AS "createdAt"
         FROM messages m
         INNER JOIN users s ON s.id = m.sender_user_id
         INNER JOIN conversation_members cm
                 ON cm.conversation_id = m.conversation_id
                AND cm.member_user_id = $2
        WHERE m.conversation_id = $1
          AND m.id > COALESCE(cm.last_read_message_id, 0)
        ORDER BY m.id ASC`,
      [conversationId, userId],
    );
  }

  // --- Message reactions (reuse the generic ReactionEntity) ---

  async findMessageReactionByUser(messageId: number, userId: number) {
    return await this.reactionRepo.findOne({
      where: {
        targetId: messageId,
        reactionTargetType: ReactionTargetType.MESSAGE,
        reacter: { id: userId },
      },
    });
  }

  /** Insert ignoring the unique (target, reacter) clash; returns false when it already existed. */
  async insertMessageReaction(
    messageId: number,
    userId: number,
    reactionType: ReactionType,
  ) {
    const insertResult = await this.reactionRepo
      .createQueryBuilder()
      .insert()
      .into(ReactionEntity)
      .values({
        targetId: messageId,
        reactionTargetType: ReactionTargetType.MESSAGE,
        reacter: { id: userId } as UserEntity,
        type: reactionType,
      })
      .orIgnore()
      .execute();
    return (insertResult.identifiers?.length ?? 0) > 0;
  }

  async updateMessageReactionType(
    reactionId: number,
    reactionType: ReactionType,
  ) {
    const updateResult = await this.reactionRepo.update(
      { id: reactionId },
      { type: reactionType },
    );
    return (updateResult.affected ?? 0) > 0;
  }

  async deleteMessageReaction(messageId: number, userId: number) {
    const deleteResult = await this.reactionRepo.delete({
      targetId: messageId,
      reactionTargetType: ReactionTargetType.MESSAGE,
      reacter: { id: userId } as UserEntity,
    });
    return (deleteResult.affected ?? 0) > 0;
  }

  /** Aggregated reaction counts per type for a single message. */
  async getMessageReactionCounts(messageId: number): Promise<ReactionCount[]> {
    const rows = await this.dataSource.query<
      Array<{ type: ReactionType; count: number }>
    >(
      `SELECT type, COUNT(*)::int AS count
         FROM reactions
        WHERE target_type = $1 AND target_id = $2
        GROUP BY type`,
      [ReactionTargetType.MESSAGE, messageId],
    );
    return rows;
  }

  /** Batch aggregated reaction counts keyed by message id (for history pages). */
  async getReactionCountsForMessages(
    messageIds: number[],
  ): Promise<Map<number, ReactionCount[]>> {
    const result = new Map<number, ReactionCount[]>();
    if (messageIds.length === 0) return result;
    const rows = await this.dataSource.query<
      Array<{ targetId: number; type: ReactionType; count: number }>
    >(
      `SELECT target_id AS "targetId", type, COUNT(*)::int AS count
         FROM reactions
        WHERE target_type = $1 AND target_id = ANY($2::bigint[])
        GROUP BY target_id, type`,
      [ReactionTargetType.MESSAGE, messageIds],
    );
    for (const row of rows) {
      const list = result.get(row.targetId) ?? [];
      list.push({ type: row.type, count: row.count });
      result.set(row.targetId, list);
    }
    return result;
  }
}
