import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { CommentEntity } from '../entities/comment.entity';
import { Brackets, In, Repository } from 'typeorm';
import { UserEntity } from '../entities/user.entity';
import { ContentEntity } from '../entities/content.entity';
import { BlockEntity } from '../entities/block.entity';
import { MediaFileEntity } from '../entities/media-file.entity';
import { FriendshipEntity } from '../entities/friendship.entity';
import { FriendshipStatus } from '../enum/friendshipstatus.enum';
import { MediaTargetType } from '../enum/media-target-type.enum';
import { ReactionTargetType } from '../enum/reactiontargettype.enum';
import { DetailComment } from './interfaces/comment.interface';

type DetailCommentQueryRow = {
  id: number | string;
  parentCommentId: number | string | null;
  text: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  commenterId: number | string;
  commenter: unknown;
  isCommenter: boolean | string | number;
  hasChildComment: boolean | string | number;
  reaction: string | null;
  mediaFiles: unknown;
  mentionedUsers: unknown;
};

@Injectable()
export class CommentRepository {
  constructor(
    @InjectRepository(CommentEntity)
    private readonly commentRepo: Repository<CommentEntity>,
    private readonly configService: ConfigService,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(ContentEntity)
    private readonly contentRepo: Repository<ContentEntity>,
    @InjectRepository(BlockEntity)
    private readonly blockRepo: Repository<BlockEntity>,
    @InjectRepository(MediaFileEntity)
    private readonly mediaFileRepo: Repository<MediaFileEntity>,
    @InjectRepository(FriendshipEntity)
    private readonly friendshipRepo: Repository<FriendshipEntity>,
  ) {}

  private normalizeJsonArray<T>(value: unknown): T[] {
    if (Array.isArray(value)) return value as T[];
    if (typeof value !== 'string') return [];
    try {
      const parsedValue: unknown = JSON.parse(value);
      return Array.isArray(parsedValue) ? (parsedValue as T[]) : [];
    } catch {
      return [];
    }
  }

  private normalizeJsonObject<T>(value: unknown): T | null {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as T;
    }
    if (typeof value !== 'string') return null;
    try {
      const parsedValue: unknown = JSON.parse(value);
      return parsedValue && typeof parsedValue === 'object'
        ? (parsedValue as T)
        : null;
    } catch {
      return null;
    }
  }

  private toBoolean(value: unknown) {
    return (
      value === true ||
      value === 'true' ||
      value === 't' ||
      value === 1 ||
      value === '1'
    );
  }

  async findUserById(userId: number) {
    return await this.userRepo.findOne({ where: { id: userId } });
  }

  async findFriends(userId: number) {
    const qb = this.friendshipRepo
      .createQueryBuilder('friendship')
      .leftJoinAndSelect('friendship.requester', 'requester')
      .leftJoinAndSelect('friendship.recipient', 'recipient')
      .where('friendship.status = :status', {
        status: FriendshipStatus.ACCEPTED,
      })
      .andWhere(
        new Brackets((qbInner) => {
          qbInner
            .where(
              new Brackets((qbUser) => {
                qbUser.where('requester.id = :userId', { userId });
              }),
            )
            .orWhere(
              new Brackets((qbUser) => {
                qbUser.where('recipient.id = :userId', { userId });
              }),
            );
        }),
      )
      .orderBy('friendship.id', 'DESC');
    const acceptedFriendships = await qb.getMany();
    const friends = acceptedFriendships.map((acceptedFriendship) => {
      if (acceptedFriendship.requester.id === userId)
        return acceptedFriendship.recipient;
      return acceptedFriendship.requester;
    });
    return friends;
  }

  async findContentWithAuthorById(contentId: number) {
    return await this.contentRepo.findOne({
      where: { id: contentId },
      relations: { author: true },
    });
  }

  async findCommentByIdAndContentId(commentId: number, contentId: number) {
    return await this.commentRepo.findOne({
      where: {
        id: commentId,
        content: { id: contentId },
      },
      relations: {
        commenter: true,
      },
    });
  }

  async findCommentWithContentAuthorAndCommenterById(commentId: number) {
    return await this.commentRepo.findOne({
      where: { id: commentId },
      relations: {
        commenter: true,
        content: { author: true },
      },
    });
  }

  async getCommentById(commentId: number, currentUserId: number) {
    const storageUrl = this.configService.getOrThrow<string>('STORAGE_URL');
    const getCommentByIdQuery = `
      SELECT 
        c.id::int as "id",
        c.parent_comment_id as "parentCommentId",
        c.text as "text",
        c.created_at as "createdAt",
        c.updated_at as "updatedAt",
        json_build_object(
          'username', commenter.username,
          'displayName', commenter.display_name,
          'avatarUrl', concat($5::text, commenter.avatar_relative_path)
        ) as "commenter",
        (commenter.id = $2) as "isCommenter",
        EXISTS(
          SELECT 1
          FROM comments child
          INNER JOIN users child_commenter
            ON child_commenter.id = child."commenter_user_id "
          WHERE child.parent_comment_id = c.id
        ) as "hasChildComment",
        (
          SELECT reactions.type
          FROM reactions
          WHERE reactions.target_id = c.id
          AND reactions.target_type = $3
          AND reactions.reacter_user_id = $2
          LIMIT 1
        ) as "reaction",
        COALESCE(mf.media_files, '[]'::json) as "mediaFiles",
        COALESCE(muc.mentioned_users, '[]'::json) as "mentionedUsers"
      FROM comments c
      INNER JOIN users commenter
        ON commenter.id = c."commenter_user_id "
      LEFT JOIN LATERAL (
        SELECT
          COALESCE(
            json_agg(
              json_build_object(
                'id', media_files.id,
                'type', media_files.type,
                'sortOrder', media_files.sort_order,
                'url', concat($5::text, media_files.relative_path)
              )
              ORDER BY media_files.sort_order
            ) FILTER (WHERE media_files.id IS NOT NULL),
            '[]'::json
          ) as "media_files"
        FROM media_files
        WHERE media_files.target_type = $4
        AND media_files.target_id = c.id
      ) mf ON TRUE
      LEFT JOIN LATERAL (
        SELECT
          COALESCE(
            json_agg(
              json_build_object(
                'username', mentioned_user.username,
                'displayName', mentioned_user.display_name,
                'avatarUrl', concat($5::text, mentioned_user.avatar_relative_path)
              )
            ) FILTER (WHERE mentioned_user.id IS NOT NULL),
            '[]'::json
          ) as "mentioned_users"
        FROM mentioned_user_comment
        INNER JOIN users mentioned_user
          ON mentioned_user.id = mentioned_user_comment.user_id
        WHERE mentioned_user_comment.comment_id = c.id
      ) muc ON TRUE
      WHERE c.id = $1
      LIMIT 1
    `;
    const [comment] = await this.commentRepo.query<
      (Omit<DetailComment, 'parentComment'> & {
        parentCommentId: number | null;
      })[]
    >(getCommentByIdQuery, [
      commentId,
      currentUserId,
      ReactionTargetType.COMMENT,
      MediaTargetType.COMMENT,
      storageUrl,
    ]);
    return comment;
  }

  async getDetailCommentRows(commentId: number, currentUserId: number) {
    const storageUrl = this.configService.getOrThrow<string>('STORAGE_URL');
    const getDetailCommentRowsQuery = `
      WITH RECURSIVE comment_chain AS (
        SELECT
          comments.id,
          comments.parent_comment_id
        FROM comments
        WHERE comments.id = $1
        UNION ALL
        SELECT
          parent.id,
          parent.parent_comment_id
        FROM comments parent
        INNER JOIN comment_chain
          ON comment_chain.parent_comment_id = parent.id
      )
      SELECT
        c.id::int as "id",
        c.parent_comment_id::int as "parentCommentId",
        c.text as "text",
        c.created_at as "createdAt",
        c.updated_at as "updatedAt",
        commenter.id::int as "commenterId",
        json_build_object(
          'username', commenter.username,
          'displayName', commenter.display_name,
          'avatarUrl',
            CASE
              WHEN commenter.avatar_relative_path IS NULL THEN NULL
              ELSE concat($5::text, commenter.avatar_relative_path)
            END
        ) as "commenter",
        (commenter.id = $2) as "isCommenter",
        EXISTS(
          SELECT 1
          FROM comments child
          WHERE child.parent_comment_id = c.id
        ) as "hasChildComment",
        (
          SELECT reactions.type
          FROM reactions
          WHERE reactions.target_id = c.id
          AND reactions.target_type = $3
          AND reactions.reacter_user_id = $2
          LIMIT 1
        ) as "reaction",
        COALESCE(mf.media_files, '[]'::json) as "mediaFiles",
        COALESCE(muc.mentioned_users, '[]'::json) as "mentionedUsers"
      FROM comment_chain
      INNER JOIN comments c
        ON c.id = comment_chain.id
      INNER JOIN users commenter
        ON commenter.id = c."commenter_user_id "
      LEFT JOIN LATERAL (
        SELECT
          COALESCE(
            json_agg(
              json_build_object(
                'id', media_files.id,
                'type', media_files.type,
                'sortOrder', media_files.sort_order,
                'url', concat($5::text, media_files.relative_path)
              )
              ORDER BY media_files.sort_order
            ) FILTER (WHERE media_files.id IS NOT NULL),
            '[]'::json
          ) as "media_files"
        FROM media_files
        WHERE media_files.target_type = $4
        AND media_files.target_id = c.id
      ) mf ON TRUE
      LEFT JOIN LATERAL (
        SELECT
          COALESCE(
            json_agg(
              json_build_object(
                'username', mentioned_user.username,
                'displayName', mentioned_user.display_name,
                'avatarUrl',
                  CASE
                    WHEN mentioned_user.avatar_relative_path IS NULL THEN NULL
                    ELSE concat($5::text, mentioned_user.avatar_relative_path)
                  END
              )
            ) FILTER (WHERE mentioned_user.id IS NOT NULL),
            '[]'::json
          ) as "mentioned_users"
        FROM mentioned_user_comment
        INNER JOIN users mentioned_user
          ON mentioned_user.id = mentioned_user_comment.user_id
        WHERE mentioned_user_comment.comment_id = c.id
      ) muc ON TRUE
    `;
    const commentRows = await this.commentRepo.query<DetailCommentQueryRow[]>(
      getDetailCommentRowsQuery,
      [
        commentId,
        currentUserId,
        ReactionTargetType.COMMENT,
        MediaTargetType.COMMENT,
        storageUrl,
      ],
    );
    if (commentRows.length === 0) {
      return { comment: null, commenterIds: [] };
    }

    const detailCommentById = new Map<number, DetailComment>();
    const parentCommentIdById = new Map<number, number | null>();
    const commenterIds: number[] = [];

    for (const commentRow of commentRows) {
      const normalizedCommentId = Number(commentRow.id);
      const normalizedParentCommentId =
        commentRow.parentCommentId === null
          ? null
          : Number(commentRow.parentCommentId);

      parentCommentIdById.set(normalizedCommentId, normalizedParentCommentId);
      commenterIds.push(Number(commentRow.commenterId));
      detailCommentById.set(normalizedCommentId, {
        id: normalizedCommentId,
        text: commentRow.text ?? null,
        mediaFiles: this.normalizeJsonArray(commentRow.mediaFiles),
        commenter:
          this.normalizeJsonObject<DetailComment['commenter']>(
            commentRow.commenter,
          ) ??
          ({
            username: '',
            displayName: '',
            avatarUrl: '',
          } as DetailComment['commenter']),
        isCommenter: this.toBoolean(commentRow.isCommenter),
        parentComment: null,
        hasChildComment: this.toBoolean(commentRow.hasChildComment),
        mentionedUsers: this.normalizeJsonArray(commentRow.mentionedUsers),
        reaction: commentRow.reaction as DetailComment['reaction'],
        createdAt: new Date(commentRow.createdAt),
        updatedAt: new Date(commentRow.updatedAt),
      });
    }

    for (const [
      mappedCommentId,
      mappedComment,
    ] of detailCommentById.entries()) {
      const parentCommentId = parentCommentIdById.get(mappedCommentId) ?? null;
      mappedComment.parentComment =
        parentCommentId === null
          ? null
          : (detailCommentById.get(parentCommentId) ?? null);
    }

    return {
      comment: detailCommentById.get(commentId) ?? null,
      commenterIds: [...new Set(commenterIds)].filter((id) =>
        Number.isInteger(id),
      ),
    };
  }

  async getTopLevelComments(
    contentId: number,
    currentUserId: number,
    cursor?: number,
  ) {
    const limit = this.configService.getOrThrow<number>('LIMIT_COMMENT_ITEM');
    const storageUrl = this.configService.getOrThrow<string>('STORAGE_URL');
    let getTopLevelCommentRowsQuery = `
      SELECT
        c.id::int as "id",
        c.text as "text",
        c.created_at as "createdAt",
        c.updated_at as "updatedAt",
        json_build_object(
          'username', commenter.username,
          'displayName', commenter.display_name,
          'avatarUrl', concat($5::text, commenter.avatar_relative_path)
        ) as "commenter",
        (commenter.id = $2) as "isCommenter",
        c.parent_comment_id as "parentCommentId",
        EXISTS(
          SELECT 1
          FROM comments child
          INNER JOIN users child_commenter
            ON child_commenter.id = child."commenter_user_id "
          WHERE child.parent_comment_id = c.id
          AND NOT EXISTS(
            SELECT 1
            FROM blocks
            WHERE blocks."blockerId" = child_commenter.id
            AND blocks."blockedUserId" = $2
          )
          AND NOT EXISTS(
            SELECT 1
            FROM blocks
            WHERE blocks."blockerId" = $2
            AND blocks."blockedUserId" = child_commenter.id
          )
        ) as "hasChildComment",
        (
          SELECT reactions.type
          FROM reactions
          WHERE reactions.target_id = c.id
          AND reactions.target_type = $3
          AND reactions.reacter_user_id = $2
          LIMIT 1
        ) as "reaction",
        COALESCE(mf.media_files, '[]'::json) as "mediaFiles",
        COALESCE(muc.mentioned_users, '[]'::json) as "mentionedUsers"
      FROM comments c
      INNER JOIN users commenter
        ON commenter.id = c."commenter_user_id "
      LEFT JOIN LATERAL (
        SELECT
          COALESCE(
            json_agg(
              json_build_object(
                'id', media_files.id,
                'type', media_files.type,
                'sortOrder', media_files.sort_order,
                'url', concat($5::text, media_files.relative_path)
              )
              ORDER BY media_files.sort_order
            ) FILTER (WHERE media_files.id IS NOT NULL),
            '[]'::json
          ) as "media_files"
        FROM media_files
        WHERE media_files.target_type = $4
        AND media_files.target_id = c.id
      ) mf ON TRUE
      LEFT JOIN LATERAL (
        SELECT
          COALESCE(
            json_agg(
              json_build_object(
                'username', mentioned_user.username,
                'displayName', mentioned_user.display_name,
                'avatarUrl', concat($5::text, mentioned_user.avatar_relative_path)
              )
            ) FILTER (WHERE mentioned_user.id IS NOT NULL),
            '[]'::json
          ) as "mentioned_users"
        FROM mentioned_user_comment
        INNER JOIN users mentioned_user
          ON mentioned_user.id = mentioned_user_comment.user_id
        WHERE mentioned_user_comment.comment_id = c.id
      ) muc ON TRUE
      WHERE c.content_id = $1
      AND c.parent_comment_id IS NULL
      AND NOT EXISTS(
        SELECT 1
        FROM blocks
        WHERE blocks."blockerId" = commenter.id
        AND blocks."blockedUserId" = $2
      )
      AND NOT EXISTS(
        SELECT 1
        FROM blocks
        WHERE blocks."blockerId" = $2
        AND blocks."blockedUserId" = commenter.id
      )
    `;
    const params: Array<string | number> = [
      contentId,
      currentUserId,
      ReactionTargetType.COMMENT,
      MediaTargetType.COMMENT,
      storageUrl,
    ];
    if (cursor) {
      params.push(cursor);
      getTopLevelCommentRowsQuery += `
        AND c.id < $6
      `;
    }
    params.push(limit);
    getTopLevelCommentRowsQuery += `
      ORDER BY c.id DESC
      LIMIT $${params.length}
    `;
    return await this.commentRepo.query<
      (Omit<DetailComment, 'parentComment'> & {
        parentCommentId: number | null;
      })[]
    >(getTopLevelCommentRowsQuery, params);
  }

  async getChildComments(
    parentCommentId: number,
    currentUserId: number,
    cursor?: number,
  ) {
    const limit = this.configService.getOrThrow<number>('LIMIT_COMMENT_ITEM');
    const storageUrl = this.configService.getOrThrow<string>('STORAGE_URL');
    let getChildCommentRowsQuery = `
      SELECT
        c.id::int as "id",
        c.text as "text",
        c.created_at as "createdAt",
        c.updated_at as "updatedAt",
        c.parent_comment_id as "parentCommentId",
        json_build_object(
          'username', commenter.username,
          'displayName', commenter.display_name,
          'avatarUrl',
            CASE
              WHEN commenter.avatar_relative_path IS NULL THEN NULL
              ELSE concat($5 :: text, commenter.avatar_relative_path)
            END
        ) as "commenter",
        (commenter.id = $2) as "isCommenter",
        EXISTS(
          SELECT 1
          FROM comments child
          INNER JOIN users child_commenter
            ON child_commenter.id = child."commenter_user_id "
          WHERE child.parent_comment_id = c.id
          AND NOT EXISTS(
            SELECT 1
            FROM blocks
            WHERE blocks."blockerId" = child_commenter.id
            AND blocks."blockedUserId" = $2
          )
          AND NOT EXISTS(
            SELECT 1
            FROM blocks
            WHERE blocks."blockerId" = $2
            AND blocks."blockedUserId" = child_commenter.id
          )
        ) as "hasChildComment",
        (
          SELECT reactions.type
          FROM reactions
          WHERE reactions.target_id = c.id
          AND reactions.target_type = $3
          AND reactions.reacter_user_id = $2
          LIMIT 1
        ) as "reaction",
        COALESCE(mf.media_files, '[]'::json) as "mediaFiles",
        COALESCE(muc.mentioned_users, '[]'::json) as "mentionedUsers"
      FROM comments c
      INNER JOIN users commenter
        ON commenter.id = c."commenter_user_id "
      LEFT JOIN LATERAL (
        SELECT
          COALESCE(
            json_agg(
              json_build_object(
                'id', media_files.id,
                'type', media_files.type,
                'sortOrder', media_files.sort_order,
                'url', concat($5::text, media_files.relative_path)
              )
              ORDER BY media_files.sort_order
            ) FILTER (WHERE media_files.id IS NOT NULL),
            '[]'::json
          ) as "media_files"
        FROM media_files
        WHERE media_files.target_type = $4
        AND media_files.target_id = c.id
      ) mf ON TRUE
      LEFT JOIN LATERAL (
        SELECT
          COALESCE(
            json_agg(
              json_build_object(
                'username', mentioned_user.username,
                'displayName', mentioned_user.display_name,
                'avatarUrl',
                  CASE
                    WHEN mentioned_user.avatar_relative_path IS NULL THEN NULL
                    ELSE concat($5::text, mentioned_user.avatar_relative_path)
                  END
              )
            ) FILTER (WHERE mentioned_user.id IS NOT NULL),
            '[]'::json
          ) as "mentioned_users"
        FROM mentioned_user_comment
        INNER JOIN users mentioned_user
          ON mentioned_user.id = mentioned_user_comment.user_id
        WHERE mentioned_user_comment.comment_id = c.id
      ) muc ON TRUE
      WHERE c.parent_comment_id = $1
      AND NOT EXISTS(
        SELECT 1
        FROM blocks
        WHERE blocks."blockerId" = commenter.id
        AND blocks."blockedUserId" = $2
      )
      AND NOT EXISTS(
        SELECT 1
        FROM blocks
        WHERE blocks."blockerId" = $2
        AND blocks."blockedUserId" = commenter.id
      )
    `;
    const params: Array<string | number> = [
      parentCommentId,
      currentUserId,
      ReactionTargetType.COMMENT,
      MediaTargetType.COMMENT,
      storageUrl,
    ];
    if (cursor) {
      params.push(cursor);
      getChildCommentRowsQuery += `
        AND c.id < $6
      `;
    }
    params.push(limit);
    getChildCommentRowsQuery += `
      ORDER BY c.id DESC
      LIMIT $${params.length}
    `;
    return await this.commentRepo.query<
      (Omit<DetailComment, 'parentComment'> & {
        parentCommentId: number | null;
      })[]
    >(getChildCommentRowsQuery, params);
  }

  async findOwnedCommentById(commentId: number, currentUserId: number) {
    return await this.commentRepo.findOne({
      where: {
        id: commentId,
        commenter: { id: currentUserId },
      },
    });
  }

  async getCommentTreeIds(rootCommentId: number) {
    const commentIdRows = await this.commentRepo.query<
      { id: number | string }[]
    >(
      `
        WITH RECURSIVE comment_tree AS (
          SELECT id
          FROM comments
          WHERE id = $1
          UNION ALL
          SELECT child.id
          FROM comments child
          INNER JOIN comment_tree parent_tree
            ON child.parent_comment_id = parent_tree.id
        )
        SELECT id
        FROM comment_tree
      `,
      [rootCommentId],
    );

    return commentIdRows
      .map((commentIdRow) => Number(commentIdRow.id))
      .filter((commentId) => Number.isInteger(commentId));
  }

  async checkBlocked(blockedId: number, blockerId: number) {
    return await this.blockRepo.findOne({
      where: {
        blockedUser: { id: blockedId },
        blocker: { id: blockerId },
      },
    });
  }

  async findOwnedCommentWithRelationsById(
    commentId: number,
    currentUserId: number,
  ) {
    return await this.commentRepo.findOne({
      where: {
        id: commentId,
        commenter: { id: currentUserId },
      },
      relations: {
        commenter: true,
        mentionedUsers: true,
        content: { author: true },
        parentComment: { commenter: true },
      },
    });
  }

  async isBlockedByAnyTarget(currentUserId: number, targetUserIds: number[]) {
    if (targetUserIds.length === 0) return false;
    return await this.blockRepo.exists({
      where: targetUserIds.map((targetUserId) => ({
        blockedUser: { id: currentUserId },
        blocker: { id: targetUserId },
      })),
    });
  }

  async isAnyTargetBlockedByCurrentUser(
    currentUserId: number,
    targetUserIds: number[],
  ) {
    if (targetUserIds.length === 0) return false;
    return await this.blockRepo.exists({
      where: targetUserIds.map((targetUserId) => ({
        blockedUser: { id: targetUserId },
        blocker: { id: currentUserId },
      })),
    });
  }

  async insertComment(
    content: ContentEntity,
    commenter: UserEntity,
    text: string | null,
    mentionedUsers: UserEntity[],
    parentComment: CommentEntity | undefined,
  ) {
    const comment: Partial<CommentEntity> = {
      content: content,
      commenter: commenter,
      text: text,
      parentComment: parentComment,
      mentionedUsers: mentionedUsers,
    };
    return await this.commentRepo.save(comment);
  }

  async insertMedias(mediaFiles: MediaFileEntity[]) {
    return await this.mediaFileRepo.save(mediaFiles);
  }

  async updateCommentById(
    commentId: number,
    payload: {
      text?: string | null;
      mentionedUserIds?: number[];
      previousMentionedUserIds?: number[];
      mediaFiles?: MediaFileEntity[];
    },
  ) {
    await this.commentRepo.manager.transaction(async (manager) => {
      const commentRepository = manager.getRepository(CommentEntity);
      const mediaFileRepository = manager.getRepository(MediaFileEntity);

      if (payload.text !== undefined) {
        await commentRepository.update(
          { id: commentId },
          { text: payload.text },
        );
      }

      if (payload.mentionedUserIds !== undefined) {
        const mentionedUserIds = payload.mentionedUserIds;
        const previousMentionedUserIds = payload.previousMentionedUserIds ?? [];

        if (
          mentionedUserIds.length > 0 ||
          previousMentionedUserIds.length > 0
        ) {
          await manager
            .createQueryBuilder()
            .relation(CommentEntity, 'mentionedUsers')
            .of(commentId)
            .addAndRemove(mentionedUserIds, previousMentionedUserIds);
        }
      }

      if (payload.mediaFiles !== undefined) {
        await mediaFileRepository.delete({
          targetType: MediaTargetType.COMMENT,
          targetId: commentId,
        });

        if (payload.mediaFiles.length > 0) {
          await mediaFileRepository.save(payload.mediaFiles);
        }
      }
    });
  }

  async getCommentMediaFilesByCommentIds(commentIds: number[]) {
    if (commentIds.length === 0) return [];
    return await this.mediaFileRepo.find({
      where: {
        targetType: MediaTargetType.COMMENT,
        targetId: In(commentIds),
      },
    });
  }

  async getMediaFileByCommentId(commentId: number) {
    return await this.mediaFileRepo.find({
      where: { targetType: MediaTargetType.COMMENT, targetId: commentId },
    });
  }

  async deleteCommentTreeWithMediaByRootId(rootCommentId: number) {
    const commentIds = await this.getCommentTreeIds(rootCommentId);
    if (commentIds.length === 0) return;

    await this.commentRepo.manager.transaction(async (manager) => {
      const mediaFileRepository = manager.getRepository(MediaFileEntity);
      const commentRepository = manager.getRepository(CommentEntity);

      await mediaFileRepository.delete({
        targetType: MediaTargetType.COMMENT,
        targetId: In(commentIds),
      });
      await commentRepository.delete({
        id: rootCommentId,
      });
    });
  }

  async deleteCommentById(commentId: number) {
    await this.commentRepo.delete({ id: commentId });
  }
}
