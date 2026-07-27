import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { ConversationEntity } from 'src/entities/conversation.entity';
import { ConversationMemberEntity } from 'src/entities/conversation-member.entity';
import { UserEntity } from 'src/entities/user.entity';
import { ConversationType } from 'src/enum/conversation-type.enum';
import { ConversationMemberRole } from 'src/enum/conversation-member-role.enum';
import { DataSource, Repository } from 'typeorm';
import { Message } from 'src/common/interface/message.interface';
import { UserWithId } from 'src/common/interface/user-with-id.interface';
import { ConversationSummary } from './interfaces/conversation-summary.interface';

/**
 * Opaque cursor payload for paging the inbox. Pinned conversations sort first
 * and are capped (CHAT_MAX_PINNED_CONVERSATIONS < CHAT_PAGE_LIMIT), so a full
 * first page always captures them all and every cursor resumes inside the
 * unpinned segment — the cursor only needs the last message id.
 */
export interface ConversationInboxCursor {
  lastMessageId: number;
}

export class ConversationRepository {
  private readonly conversationLimit: number;

  constructor(
    @InjectRepository(ConversationEntity)
    private readonly conversationRepo: Repository<ConversationEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {
    this.conversationLimit =
      configService.getOrThrow<number>('CONVERSATION_LIMIT');
  }

  /** Deterministic key so two users always resolve to the same direct conversation row. */
  buildDirectKey(firstUserId: number, secondUserId: number) {
    return firstUserId < secondUserId
      ? `${firstUserId}:${secondUserId}`
      : `${secondUserId}:${firstUserId}`;
  }

  async createDirectConversation(sender: UserEntity, receiver: UserEntity) {
    const directKey = this.buildDirectKey(sender.id, receiver.id);
    return await this.dataSource.transaction(async (manager) => {
      const conversationRepo = manager.getRepository(ConversationEntity);
      const memberRepo = manager.getRepository(ConversationMemberEntity);

      const conversation = await conversationRepo.save({
        type: ConversationType.DIRECT,
        directKey,
      });

      await memberRepo.save([
        {
          userId: sender.id,
          conversationId: conversation.id,
          role: ConversationMemberRole.MEMBER,
        },
        {
          userId: receiver.id,
          conversationId: conversation.id,
          role: ConversationMemberRole.MEMBER,
        },
      ]);

      return conversation;
    });
  }

  async findUserById(userId: number) {
    return await this.userRepo.findOne({ where: { id: userId } });
  }

  async findUserByUsername(username: string) {
    return await this.userRepo.findOne({ where: { username: username } });
  }

  async findDirectConversationByDirectKey(directKey: string) {
    return await this.conversationRepo.findOne({
      where: { directKey: directKey },
    });
  }

  /** Returns the conversation only when the given user is one of its members. */
  async findConversationForMember(conversationId: number, userId: number) {
    return await this.conversationRepo
      .createQueryBuilder('conversation')
      .innerJoin(
        ConversationMemberEntity,
        'member',
        'member.conversation_id = conversation.id AND member.member_user_id = :userId',
        { userId },
      )
      .where('conversation.id = :conversationId', { conversationId })
      .getOne();
  }

  /** Returns the conversation ids that the given user is a member of. */
  async findConversationIdsOfUser(userId: number) {
    const rows = await this.dataSource.query<
      Array<{ conversation_id: number }>
    >(
      `SELECT conversation_id FROM conversation_members WHERE member_user_id = $1`,
      [userId],
    );
    return rows.map((row) => row.conversation_id);
  }

  /**
   * Returns the distinct ids of every user that shares at least one
   * conversation with the given user (excluding the user themselves). Used as
   * the default audience for presence snapshots.
   */
  async findChatPartnerIds(userId: number) {
    const rows = await this.dataSource.query<Array<{ member_user_id: number }>>(
      `SELECT DISTINCT cm.member_user_id
         FROM conversation_members cm
        WHERE cm.conversation_id IN (
                SELECT conversation_id
                  FROM conversation_members
                 WHERE member_user_id = $1
              )
          AND cm.member_user_id <> $1`,
      [userId],
    );
    return rows.map((row) => row.member_user_id);
  }

  /** Returns the user ids of every member of a conversation. */
  async findConversationMemberIds(conversationId: number) {
    const rows = await this.dataSource.query<Array<{ member_user_id: number }>>(
      `SELECT member_user_id FROM conversation_members WHERE conversation_id = $1`,
      [conversationId],
    );
    return rows.map((row) => row.member_user_id);
  }

  /** Points the conversation at its latest message for inbox previews. */
  async updateConversationLastMessage(
    conversationId: number,
    messageId: number,
  ) {
    await this.conversationRepo
      .createQueryBuilder()
      .update(ConversationEntity)
      .set({ lastMessage: { id: messageId } })
      .where('id = :conversationId', { conversationId })
      .execute();
  }

  /** Plain existence lookup so callers can tell 404 (missing) from 403 (not a member). */
  async findConversationById(conversationId: number) {
    return await this.conversationRepo.findOne({
      where: { id: conversationId },
    });
  }

  /**
   * Returns the requester's membership row (role) for a conversation, or null
   * when they don't belong to it.
   */
  async findMembership(
    conversationId: number,
    userId: number,
  ): Promise<{
    role: ConversationMemberRole;
    pinned: boolean;
  } | null> {
    const rows = await this.dataSource.query<
      Array<{ role: ConversationMemberRole; pinned: boolean }>
    >(
      `SELECT role, is_pinned AS pinned
         FROM conversation_members
        WHERE conversation_id = $1 AND member_user_id = $2
        LIMIT 1`,
      [conversationId, userId],
    );
    return rows[0] ?? null;
  }

  async findUsersByUsernames(usernames: string[]): Promise<UserEntity[]> {
    if (usernames.length === 0) return [];
    return await this.userRepo
      .createQueryBuilder('user')
      .where('user.username IN (:...usernames)', { usernames })
      .getMany();
  }

  /**
   * Create a GROUP conversation managed by `admin` (its sole ADMIN) and seeded
   * with `members`. `directKey` is required+unique, so groups get a random one.
   */
  async createGroupConversation(
    admin: UserEntity,
    name: string | undefined,
    members: UserEntity[],
  ) {
    return await this.dataSource.transaction(async (manager) => {
      const conversationRepo = manager.getRepository(ConversationEntity);
      const memberRepo = manager.getRepository(ConversationMemberEntity);

      const conversation = await conversationRepo.save({
        type: ConversationType.GROUP,
        name: name ?? undefined,
      });

      await memberRepo.save([
        {
          userId: admin.id,
          conversationId: conversation.id,
          role: ConversationMemberRole.ADMIN,
        },
        ...members.map((member) => ({
          userId: member.id,
          conversationId: conversation.id,
          role: ConversationMemberRole.MEMBER,
        })),
      ]);

      return conversation;
    });
  }

  async addMemberToConversation(conversationId: number, user: UserEntity) {
    await this.dataSource.getRepository(ConversationMemberEntity).save({
      userId: user.id,
      conversationId,
      role: ConversationMemberRole.MEMBER,
    });
  }

  async removeMemberFromConversation(conversationId: number, userId: number) {
    await this.dataSource.query(
      `DELETE FROM conversation_members
        WHERE conversation_id = $1 AND member_user_id = $2`,
      [conversationId, userId],
    );
  }

  /**
   * One page of the requester's inbox: the requester's pinned conversations
   * first, then the rest, each segment ordered by most-recent message
   * (cursor on `pinned` + `last_message_id`, which is monotonic). Each entry
   * carries the latest-message preview and the other members.
   */
  async findConversationsPage(
    userId: number,
    cursor: ConversationInboxCursor | undefined,
  ): Promise<ConversationSummary[]> {
    const storageUrl = this.configService.getOrThrow<string>('STORAGE_URL');
    const params: unknown[] = [userId, storageUrl];
    let cursorClause = '';
    if (cursor !== undefined) {
      params.push(cursor.lastMessageId);
      // A full first page always contains every pinned conversation (the pin
      // count is capped below the page size), so any cursor resumes inside the
      // unpinned segment.
      cursorClause = `AND cm.is_pinned = false AND c.last_message_id < $3::int`;
    }
    const limitParamIndex = params.length + 1;
    params.push(this.conversationLimit);

    const rows = await this.dataSource.query<
      Array<{
        id: number;
        type: ConversationType;
        name: string;
        pinned: boolean;
        myRole: ConversationMemberRole;
        unreadCount: number;
        members: UserWithId[];
        lastMessage: Message | null;
      }>
    >(
      `SELECT c.id,
              c.type,
              COALESCE(c.name, '') AS name,
              cm.is_pinned AS pinned,
              cm.role AS "myRole",
              (
                SELECT COUNT(*)::int
                  FROM messages m_unread
                 WHERE m_unread.conversation_id = c.id
                   AND m_unread.is_revoked = false
                   AND m_unread.id > COALESCE(cm.last_read_message_id, 0)
              ) AS "unreadCount",
              COALESCE(
                (
                  SELECT json_agg(json_build_object(
                    'id', u.id,
                    'username', u.username,
                    'displayName', u.display_name,
                    'avatarUrl', CONCAT($2::text, u.avatar_relative_path)
                  ))
                  FROM conversation_members cm2
                  INNER JOIN users u ON u.id = cm2.member_user_id
                  WHERE cm2.conversation_id = c.id
                    AND cm2.member_user_id <> $1
                ),
                '[]'::json
              ) AS members,
              CASE WHEN lm.id IS NULL THEN NULL ELSE json_build_object(
                'id', lm.id,
                'text', CASE WHEN lm.is_revoked THEN NULL ELSE lm.text END,
                'createdAt', lm.created_at,
                'sender', json_build_object(
                  'id', ls.id,
                  'username', ls.username,
                  'displayName', ls.display_name,
                  'avatarUrl', CONCAT($2::text, ls.avatar_relative_path)
                ),
                'mediaFiles', '[]'::json
              ) END AS "lastMessage"
         FROM conversations c
         INNER JOIN conversation_members cm
                 ON cm.conversation_id = c.id AND cm.member_user_id = $1
         LEFT JOIN messages lm ON lm.id = c.last_message_id
         LEFT JOIN users ls ON ls.id = lm.sender_user_id
        WHERE 1 = 1
          ${cursorClause}
        ORDER BY cm.is_pinned DESC,
                 c.last_message_id DESC NULLS LAST
        LIMIT $${limitParamIndex}`,
      params,
    );

    return rows.map((row) => ({
      id: row.id,
      type: row.type,
      name: row.name,
      pinned: row.pinned,
      myRole: row.myRole,
      unreadCount: row.unreadCount,
      members: row.members,
      lastMessage: row.lastMessage
        ? { ...row.lastMessage, mediaFiles: [] }
        : null,
    }));
  }

  /**
   * One page of the requester's inbox filtered by `key`: for GROUP
   * conversations it matches the group `name`; for DIRECT conversations it
   * matches the *other* member's username or displayName. Same pinned-first /
   * last-message-id ordering and cursor shape as `findConversationsPage`.
   */
  async searchConversationsPage(
    userId: number,
    key: string,
    cursor: ConversationInboxCursor | undefined,
  ): Promise<ConversationSummary[]> {
    const storageUrl = this.configService.getOrThrow<string>('STORAGE_URL');
    const params: unknown[] = [userId, storageUrl, `%${key}%`];
    let cursorClause = '';
    if (cursor !== undefined) {
      params.push(cursor.lastMessageId);
      cursorClause = `AND cm.is_pinned = false AND c.last_message_id < $4::int`;
    }
    const limitParamIndex = params.length + 1;
    params.push(this.conversationLimit);

    const rows = await this.dataSource.query<
      Array<{
        id: number;
        type: ConversationType;
        name: string;
        pinned: boolean;
        myRole: ConversationMemberRole;
        unreadCount: number;
        members: UserWithId[];
        lastMessage: Message | null;
      }>
    >(
      `SELECT c.id,
              c.type,
              COALESCE(c.name, '') AS name,
              cm.is_pinned AS pinned,
              cm.role AS "myRole",
              (
                SELECT COUNT(*)::int
                  FROM messages m_unread
                 WHERE m_unread.conversation_id = c.id
                   AND m_unread.is_revoked = false
                   AND m_unread.id > COALESCE(cm.last_read_message_id, 0)
              ) AS "unreadCount",
              COALESCE(
                (
                  SELECT json_agg(json_build_object(
                    'id', u.id,
                    'username', u.username,
                    'displayName', u.display_name,
                    'avatarUrl', CONCAT($2::text, u.avatar_relative_path)
                  ))
                  FROM conversation_members cm2
                  INNER JOIN users u ON u.id = cm2.member_user_id
                  WHERE cm2.conversation_id = c.id
                    AND cm2.member_user_id <> $1
                ),
                '[]'::json
              ) AS members,
              CASE WHEN lm.id IS NULL THEN NULL ELSE json_build_object(
                'id', lm.id,
                'text', CASE WHEN lm.is_revoked THEN NULL ELSE lm.text END,
                'createdAt', lm.created_at,
                'sender', json_build_object(
                  'id', ls.id,
                  'username', ls.username,
                  'displayName', ls.display_name,
                  'avatarUrl', CONCAT($2::text, ls.avatar_relative_path)
                ),
                'mediaFiles', '[]'::json
              ) END AS "lastMessage"
         FROM conversations c
         INNER JOIN conversation_members cm
                 ON cm.conversation_id = c.id AND cm.member_user_id = $1
         LEFT JOIN messages lm ON lm.id = c.last_message_id
         LEFT JOIN users ls ON ls.id = lm.sender_user_id
        WHERE (
                (c.type = '${ConversationType.GROUP}' AND c.name ILIKE $3)
                OR (
                  c.type = '${ConversationType.DIRECT}' AND EXISTS (
                    SELECT 1
                      FROM conversation_members cm_other
                      INNER JOIN users u_other ON u_other.id = cm_other.member_user_id
                     WHERE cm_other.conversation_id = c.id
                       AND cm_other.member_user_id <> $1
                       AND (u_other.username ILIKE $3 OR u_other.display_name ILIKE $3)
                  )
                )
              )
          ${cursorClause}
        ORDER BY cm.is_pinned DESC,
                 c.last_message_id DESC NULLS LAST
        LIMIT $${limitParamIndex}`,
      params,
    );

    return rows.map((row) => ({
      id: row.id,
      type: row.type,
      name: row.name,
      pinned: row.pinned,
      myRole: row.myRole,
      unreadCount: row.unreadCount,
      members: row.members,
      lastMessage: row.lastMessage
        ? { ...row.lastMessage, mediaFiles: [] }
        : null,
    }));
  }

  /**
   * Accepted friends of `userId` matching `key` (username/displayName) who
   * don't already have a DIRECT conversation with them — i.e. people the
   * search should surface as "start a new chat with" suggestions alongside
   * matching existing conversations. Capped at the same page size as the
   * inbox; not cursor-paginated (a secondary suggestions list, not the
   * primary result set).
   */
  async searchFriendsWithoutConversation(
    userId: number,
    key: string,
  ): Promise<UserWithId[]> {
    const storageUrl = this.configService.getOrThrow<string>('STORAGE_URL');
    return await this.dataSource.query<UserWithId[]>(
      `SELECT u.id AS "id",
              u.username AS "username",
              u.display_name AS "displayName",
              CONCAT($2::text, u.avatar_relative_path) AS "avatarUrl"
         FROM friendships f
         INNER JOIN users u
                 ON u.id = CASE WHEN f."requesterId" = $1
                                THEN f."recipientId"
                                ELSE f."requesterId" END
        WHERE (f."requesterId" = $1 OR f."recipientId" = $1)
          AND f.status = 'accepted'
          AND (u.username ILIKE $3 OR u.display_name ILIKE $3)
          AND NOT EXISTS (
                SELECT 1
                  FROM conversation_members cm_self
                  INNER JOIN conversation_members cm_other
                          ON cm_other.conversation_id = cm_self.conversation_id
                         AND cm_other.member_user_id = u.id
                  INNER JOIN conversations c ON c.id = cm_self.conversation_id
                 WHERE cm_self.member_user_id = $1
                   AND c.type = 'direct'
              )
        ORDER BY u.username ASC
        LIMIT $4`,
      [userId, storageUrl, `%${key}%`, this.conversationLimit],
    );
  }

  /**
   * Aggregate unread count across the user's entire inbox: total unread
   * (non-revoked) messages and how many distinct conversations have at least
   * one. Same "unread" definition as `ConversationSummary.unreadCount` —
   * includes the user's own sent messages until they mark-read.
   */
  async countUnreadMessages(userId: number): Promise<{
    totalUnreadMessages: number;
    unreadConversationCount: number;
  }> {
    const rows = await this.dataSource.query<
      Array<{ totalUnreadMessages: number; unreadConversationCount: number }>
    >(
      `SELECT
         COUNT(*)::int AS "totalUnreadMessages",
         COUNT(DISTINCT cm.conversation_id)::int AS "unreadConversationCount"
       FROM conversation_members cm
       INNER JOIN messages m
               ON m.conversation_id = cm.conversation_id
              AND m.is_revoked = false
              AND m.id > COALESCE(cm.last_read_message_id, 0)
       WHERE cm.member_user_id = $1`,
      [userId],
    );
    return rows[0];
  }

  /** Count how many conversations the user currently has pinned. */
  async countPinnedConversations(userId: number): Promise<number> {
    const rows = await this.dataSource.query<Array<{ count: number }>>(
      `SELECT COUNT(*)::int AS count
         FROM conversation_members
        WHERE member_user_id = $1 AND is_pinned = true`,
      [userId],
    );
    return rows[0]?.count ?? 0;
  }

  /**
   * Advance a member's read pointer to `lastReadMessageId`. A no-op when the
   * provided id is older than the current pointer (prevents going backward).
   */
  async markConversationRead(
    conversationId: number,
    userId: number,
    lastReadMessageId: number,
  ): Promise<void> {
    await this.dataSource.query(
      `UPDATE conversation_members
          SET last_read_message_id = $3
        WHERE conversation_id = $1 AND member_user_id = $2
          AND (last_read_message_id IS NULL OR last_read_message_id < $3)`,
      [conversationId, userId, lastReadMessageId],
    );
  }

  /**
   * Set or clear the requester's pin on a conversation (per-member flag).
   * Both directions are idempotent.
   */
  async setMembershipPinned(
    conversationId: number,
    userId: number,
    pinned: boolean,
  ) {
    await this.dataSource.query(
      `UPDATE conversation_members
          SET is_pinned = $3
        WHERE conversation_id = $1 AND member_user_id = $2`,
      [conversationId, userId, pinned],
    );
  }

  /**
   * Members whose read pointer has reached or passed `messageId` — i.e. who
   * has read up to and including this message. Reuses the existing per-member
   * `last_read_message_id` pointer rather than a dedicated per-message table.
   */
  async findReadersOfMessage(conversationId: number, messageId: number) {
    const rows = await this.dataSource.query<
      Array<{ userId: number; lastReadMessageId: number }>
    >(
      `SELECT member_user_id AS "userId", last_read_message_id AS "lastReadMessageId"
         FROM conversation_members
        WHERE conversation_id = $1 AND last_read_message_id >= $2`,
      [conversationId, messageId],
    );
    return rows;
  }

  /** Count how many ADMIN members a conversation currently has. */
  async countAdmins(conversationId: number): Promise<number> {
    const rows = await this.dataSource.query<Array<{ count: number }>>(
      `SELECT COUNT(*)::int AS count
         FROM conversation_members
        WHERE conversation_id = $1 AND role = $2`,
      [conversationId, ConversationMemberRole.ADMIN],
    );
    return rows[0]?.count ?? 0;
  }

  /** Set a member's role within a conversation. */
  async setMemberRole(
    conversationId: number,
    userId: number,
    role: ConversationMemberRole,
  ): Promise<void> {
    await this.dataSource.query(
      `UPDATE conversation_members
          SET role = $3
        WHERE conversation_id = $1 AND member_user_id = $2`,
      [conversationId, userId, role],
    );
  }
}
