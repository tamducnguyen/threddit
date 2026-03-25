import { InjectRepository } from '@nestjs/typeorm';
import { ContentEntity } from '../entities/content.entity';
import { Brackets, In, Repository } from 'typeorm';
import { UserEntity } from '../entities/user.entity';
import { ConfigService } from '@nestjs/config';
import { TimelineItem } from './interface/timeline-item.interface';
import { ReactionTargetType } from '../enum/reactiontargettype.enum';
import { MediaTargetType } from '../enum/media-target-type.enum';
import { TimelineCursor } from './interface/timeline-cursor.interface';
import { BlockEntity } from '../entities/block.entity';
import { MediaFileEntity } from '../entities/media-file.entity';
import { FriendshipEntity } from '../entities/friendship.entity';
import { FriendshipStatus } from '../enum/friendshipstatus.enum';
import { ContentType } from '../enum/contenttype.enum';
import { ContentDetail } from './interface/content-detail.interface';
import { SavedContent } from './interface/saved-content.interface';
import { FollowEntity } from '../entities/follow.entity';
import { MediaType } from '../enum/media-type.enum';
import { SearchContentCursor } from './interface/search-content-cursor.interface';

export class ContentRepository {
  constructor(
    @InjectRepository(ContentEntity)
    private readonly contentRepo: Repository<ContentEntity>,
    private readonly configService: ConfigService,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(BlockEntity)
    private readonly blockRepo: Repository<BlockEntity>,
    @InjectRepository(MediaFileEntity)
    private readonly mediaFileRepo: Repository<MediaFileEntity>,
    @InjectRepository(FriendshipEntity)
    private readonly friendshipRepo: Repository<FriendshipEntity>,
    @InjectRepository(FollowEntity)
    private readonly followRepo: Repository<FollowEntity>,
  ) {}
  async checkBlocked(blockedId: number, blockerId: number) {
    return await this.blockRepo.exists({
      where: {
        blockedUser: { id: blockedId },
        blocker: { id: blockerId },
      },
    });
  }
  async getPinnedContents(timelineOwnerId: number, currentUserId: number) {
    const getPinnedContentsQuery = `
      SELECT
        contents.id as "id",
        contents.created_at as "createdAt",
        contents.updated_at as "updatedAt",
        contents.is_pinned as "isPinned",
        (
          SELECT EXISTS(
            SELECT 1
            FROM shares
            WHERE shares.shared_content_id = contents.id
            AND shares.sharer_user_id = $5
          )
        ) as "isShared",
        (contents.author_user_id = $5) as "isOwner",
        json_build_object(
          'username', author.username,
          'displayName', author.display_name,
          'avatarUrl', CONCAT($2::text, author.avatar_relative_path)
        ) as "author",
        mucs.mentionedUsers as "mentionedUsers",
        contents.text as "text",
        mf.mediaFiles as "mediaFiles",
        contents.type as "type",
        (
          SELECT COUNT(*) :: int
          FROM comments
          WHERE comments.content_id = contents.id
        ) AS "commentNumber",
        (
          SELECT COUNT(*) :: int
          FROM saves
          WHERE saves.saved_content_id = contents.id
        ) AS "saveNumber",
        (
          SELECT COUNT(*) :: int
          FROM shares
          WHERE shares.shared_content_id = contents.id
        ) AS "shareNumber",
        (
          SELECT COUNT(*) :: int
          FROM reactions
          WHERE reactions.target_id = contents.id
          AND reactions.target_type = $3
        ) AS "reactionNumber",
        (
          SELECT EXISTS(
            SELECT 1
            FROM saves
            WHERE saves.saved_content_id = contents.id
            AND saves.saver_user_id = $5
          )
        ) AS "isSaved",
        (
          SELECT reactions.type
          FROM reactions
          WHERE reactions.target_id = contents.id
          AND reactions.target_type = $3
          AND reactions.reacter_user_id = $5
          LIMIT 1
        ) AS "reaction"
      FROM contents
      LEFT JOIN users author
      ON author.id = contents.author_user_id
      LEFT JOIN LATERAL (
        SELECT
        COALESCE(
          json_agg(
            json_build_object(
              'username', mu.username,
              'displayName', mu.display_name,
              'avatarUrl', CONCAT($2::text, mu.avatar_relative_path)
            )
          )FILTER (WHERE mu.id IS NOT NULL), '[]'::json
        ) as mentionedUsers
        FROM mentioned_user_content muc
        LEFT JOIN users mu
        ON mu.id = muc.user_id
        WHERE muc.content_id = contents.id
      ) mucs ON true
      LEFT JOIN LATERAL (
        SELECT
        COALESCE(
          json_agg(
            json_build_object(
              'url', CONCAT($2, mf.relative_path),
              'type', mf.type,
              'id', mf.id,
              'sortOrder', mf.sort_order
            )
          ) FILTER (WHERE mf.id IS NOT NULL), '[]'::json
        ) as mediaFiles
        FROM media_files mf
        WHERE mf.target_id = contents.id
        AND mf.target_type = $4
      ) mf ON true
      WHERE contents.author_user_id = $1
      AND contents.is_pinned = true
      AND contents.type = $6
      ORDER BY contents.id DESC
    `;
    return await this.contentRepo.query<ContentDetail[]>(
      getPinnedContentsQuery,
      [
        timelineOwnerId,
        this.configService.getOrThrow<string>('STORAGE_URL'),
        ReactionTargetType.CONTENT,
        MediaTargetType.CONTENT,
        currentUserId,
        ContentType.POST,
      ],
    );
  }
  async getTimelineItems(
    timelineOwnerId: number,
    currentUserId: number,
    cursor?: TimelineCursor,
  ) {
    let getTimelineContentQuery = `
      SELECT
        timeline_items.id as "id",
        timeline_items.created_at as "createdAt",
        timeline_items.updated_at as "updatedAt",
        timeline_items.is_pinned as "isPinned",
        timeline_items.text as "text",
        timeline_items.type as "type",
        (timeline_items.author_user_id = $6) as "isOwner",
        json_build_object(
          'username', author.username,
          'displayName', author.display_name,
          'avatarUrl', CONCAT($2::text, author.avatar_relative_path)
        ) as "author",
        mucs.mentionedUsers as "mentionedUsers",
        mf.mediaFiles as "mediaFiles",
        ( 
          SELECT COUNT(*) :: int
          FROM comments
          WHERE comments.content_id = timeline_items.id
        ) AS "commentNumber",
        ( 
          SELECT COUNT(*) :: int
          FROM saves
          WHERE saves.saved_content_id = timeline_items.id
        ) AS "saveNumber",
        (
          SELECT COUNT(*) :: int
          FROM shares
          WHERE shares.shared_content_id = timeline_items.id
        ) AS "shareNumber",
        ( 
          SELECT COUNT(*) :: int
          FROM reactions
          WHERE reactions.target_id = timeline_items.id
          AND reactions.target_type = $3
        ) AS "reactionNumber",
        (
          SELECT EXISTS(
            SELECT 1
            FROM saves
            WHERE saves.saved_content_id = timeline_items.id
            AND saves.saver_user_id = $6
          )
        ) AS "isSaved",
        (
          SELECT EXISTS(
            SELECT 1
            FROM shares
            WHERE shares.shared_content_id = timeline_items.id
            AND shares.sharer_user_id = $6
          )
        ) as "isShared",
        (
          SELECT reactions.type
          FROM reactions
          WHERE reactions.target_id = timeline_items.id
          AND reactions.target_type = $3
          AND reactions.reacter_user_id = $6
          LIMIT 1
        ) AS "reaction",
        timeline_items.share_message as "shareMessage",
        (
          SELECT 
            json_build_object
              (
                'username', sharer.username,
                'displayName', sharer.display_name,
                'avatarUrl', CONCAT($2::text, sharer.avatar_relative_path)
              ) as "sharer"
          FROM users sharer
          WHERE sharer.id = timeline_items.sharer_user_id
        ) as "sharer",
        timeline_items.share_id as "shareId",
        timeline_items.shared_at as "sharedAt"
      FROM 
      (
        SELECT 
          null as shared_at,
          null as share_message,
          null as share_id,
          null as sharer_user_id,
          contents.id,
          contents.created_at,
          contents.updated_at,
          contents.is_pinned,
          contents.author_user_id,
          contents.text,
          contents.type
        FROM contents 
        WHERE contents.author_user_id = $1
        AND contents.is_pinned = false
        AND contents.type = $7
        UNION 
        SELECT
          shares.created_at as shared_at,
          shares.message as share_message,
          shares.id as shareId,
          shares.sharer_user_id,
          shares.shared_content_id as id,
          shared_content.created_at,
          shared_content.updated_at,
          shared_content.is_pinned,
          shared_content.author_user_id,
          shared_content.text,
          shared_content.type
        FROM shares
        LEFT JOIN contents shared_content
        ON shares.shared_content_id = shared_content.id
        WHERE shares.sharer_user_id = $1
      ) as timeline_items
      LEFT JOIN users author
      ON author.id = timeline_items.author_user_id
      LEFT JOIN LATERAL (
        SELECT 
        COALESCE(
          json_agg(
            json_build_object(
              'username', mu.username,
              'displayName', mu.display_name,
              'avatarUrl', CONCAT($2::text, mu.avatar_relative_path) 
            ) 
          )FILTER (WHERE mu.id IS NOT NULL), '[]'::json
        ) as mentionedUsers
        FROM mentioned_user_content muc
        LEFT JOIN users mu
        ON mu.id = muc.user_id
        WHERE muc.content_id = timeline_items.id
      ) mucs ON true
      LEFT JOIN LATERAL (
        SELECT 
        COALESCE(
          json_agg(
            json_build_object(
              'url', CONCAT($2, mf.relative_path),
              'type', mf.type,
              'id', mf.id,
              'sortOrder', mf.sort_order
            )
          ) FILTER (WHERE mf.id IS NOT NULL), '[]'::json
        ) as mediaFiles
        FROM media_files mf
        WHERE mf.target_id = timeline_items.id
        AND mf.target_type = $5
      ) mf ON true
    `;
    const params: Array<string | number | Date> = [
      timelineOwnerId,
      this.configService.getOrThrow<string>('STORAGE_URL'),
      ReactionTargetType.CONTENT,
      Number(this.configService.getOrThrow<number>('LIMIT_CONTENT_ITEM')),
      MediaTargetType.CONTENT,
      currentUserId,
      ContentType.POST,
    ];
    if (cursor) {
      params.push(
        cursor.timelineCreatedAt,
        cursor.timelineShareRank,
        cursor.timelineId,
      );
      getTimelineContentQuery += `
        WHERE
        (
          COALESCE(timeline_items.shared_at, timeline_items.created_at) < $8
          OR (
            COALESCE(timeline_items.shared_at, timeline_items.created_at) = $8
            AND (
              (CASE WHEN timeline_items.shared_at IS NOT NULL THEN 2 ELSE 1 END) < $9
              OR (
                (CASE WHEN timeline_items.shared_at IS NOT NULL THEN 2 ELSE 1 END) = $9
                AND COALESCE(timeline_items.share_id, timeline_items.id) < $10
              )
            )
          )
        )
    `;
    }
    getTimelineContentQuery += `
      ORDER BY
        COALESCE(timeline_items.shared_at,timeline_items.created_at) DESC,
        (CASE WHEN timeline_items.shared_at IS NOT NULL THEN 2 ELSE 1 END) DESC,
        COALESCE(timeline_items.share_id,timeline_items.id) DESC
      LIMIT $4
    `;
    const timelineContents = await this.contentRepo.query<TimelineItem[]>(
      getTimelineContentQuery,
      params,
    );
    return timelineContents;
  }
  async getFeedItems(
    currentUserId: number,
    excludedContentIds: number[],
    friendIds: number[],
    followingIds: number[],
  ) {
    const getFeedItemsQuery = `
      WITH timeline_items AS (
        SELECT
          NULL::timestamptz AS shared_at,
          NULL::text AS share_message,
          NULL::int AS share_id,
          NULL::int AS sharer_user_id,
          contents.id,
          contents.created_at,
          contents.updated_at,
          contents.is_pinned,
          contents.author_user_id,
          contents.text,
          contents.type
        FROM contents
        WHERE contents.is_pinned = false
        AND contents.type = $9
        UNION
        SELECT
          shares.created_at AS shared_at,
          shares.message AS share_message,
          shares.id AS share_id,
          shares.sharer_user_id AS sharer_user_id,
          shared_content.id,
          shared_content.created_at,
          shared_content.updated_at,
          shared_content.is_pinned,
          shared_content.author_user_id,
          shared_content.text,
          shared_content.type
        FROM shares
        INNER JOIN contents shared_content
        ON shares.shared_content_id = shared_content.id
        WHERE shared_content.type = $9
      ),
      content_stats AS (
        SELECT
          timeline_items.id as content_id,
          (
            SELECT COUNT(*) :: int
            FROM comments
            WHERE comments.content_id = timeline_items.id
          ) as comment_count,
          (
            SELECT COUNT(*) :: int
            FROM saves
            WHERE saves.saved_content_id = timeline_items.id
          ) as save_count,
          (
            SELECT COUNT(*) :: int
            FROM shares
            WHERE shares.shared_content_id = timeline_items.id
          ) as share_count,
          (
            SELECT COUNT(*) :: int
            FROM reactions
            WHERE reactions.target_id = timeline_items.id
            AND reactions.target_type = $3
          ) as reaction_count
        FROM timeline_items
        GROUP BY timeline_items.id
      )
      SELECT
        timeline_items.id as "id",
        timeline_items.created_at as "createdAt",
        timeline_items.updated_at as "updatedAt",
        timeline_items.is_pinned as "isPinned",
        timeline_items.text as "text",
        timeline_items.type as "type",
        (timeline_items.author_user_id = $1) as "isOwner",
        json_build_object(
          'username', author.username,
          'displayName', author.display_name,
          'avatarUrl', CONCAT($2::text, author.avatar_relative_path)
        ) as "author",
        mucs.mentionedUsers as "mentionedUsers",
        mf.mediaFiles as "mediaFiles",
        stats.comment_count as "commentNumber",
        stats.save_count as "saveNumber",
        stats.share_count as "shareNumber",
        stats.reaction_count as "reactionNumber",
        (
          SELECT EXISTS(
            SELECT 1
            FROM saves
            WHERE saves.saved_content_id = timeline_items.id
            AND saves.saver_user_id = $1
          )
        ) AS "isSaved",
        (
          SELECT EXISTS(
            SELECT 1
            FROM shares
            WHERE shares.shared_content_id = timeline_items.id
            AND shares.sharer_user_id = $1
          )
        ) as "isShared",
        (
          SELECT reactions.type
          FROM reactions
          WHERE reactions.target_id = timeline_items.id
          AND reactions.target_type = $3
          AND reactions.reacter_user_id = $1
          LIMIT 1
        ) AS "reaction",
        timeline_items.share_message as "shareMessage",
        (
          SELECT
            json_build_object(
              'username', sharer.username,
              'displayName', sharer.display_name,
              'avatarUrl', CONCAT($2::text, sharer.avatar_relative_path)
            )
          FROM users sharer
          WHERE sharer.id = timeline_items.sharer_user_id
        ) as "sharer",
        timeline_items.share_id as "shareId",
        timeline_items.shared_at as "sharedAt"
      FROM timeline_items
      INNER JOIN content_stats stats
      ON stats.content_id = timeline_items.id
      LEFT JOIN users author
      ON author.id = timeline_items.author_user_id
      LEFT JOIN LATERAL (
        SELECT
        COALESCE(
          json_agg(
            json_build_object(
              'username', mu.username,
              'displayName', mu.display_name,
              'avatarUrl', CONCAT($2::text, mu.avatar_relative_path)
            )
            ORDER BY mu.id
          ) FILTER (WHERE mu.id IS NOT NULL), '[]'::json
        ) as mentionedUsers
        FROM mentioned_user_content muc
        LEFT JOIN users mu
        ON mu.id = muc.user_id
        WHERE muc.content_id = timeline_items.id
      ) mucs ON true
      LEFT JOIN LATERAL (
        SELECT
        COALESCE(
          json_agg(
            json_build_object(
              'url', CONCAT($2, mf.relative_path),
              'type', mf.type,
              'id', mf.id,
              'sortOrder', mf.sort_order
            )
            ORDER BY mf.sort_order
          ) FILTER (WHERE mf.id IS NOT NULL), '[]'::json
        ) as mediaFiles
        FROM media_files mf
        WHERE mf.target_id = timeline_items.id
        AND mf.target_type = $5
      ) mf ON true
      WHERE timeline_items.type = $9
      AND NOT (timeline_items.id = ANY($6::int[]))
      AND NOT EXISTS (
        SELECT 1
        FROM blocks
        WHERE blocks."blockerId" = timeline_items.author_user_id
        AND blocks."blockedUserId" = $1
      )
      AND NOT EXISTS (
        SELECT 1
        FROM blocks
        WHERE blocks."blockerId" = $1
        AND blocks."blockedUserId" = timeline_items.author_user_id
      )
      AND (
        timeline_items.sharer_user_id IS NULL
        OR (
          NOT EXISTS (
            SELECT 1
            FROM blocks
            WHERE blocks."blockerId" = timeline_items.sharer_user_id
            AND blocks."blockedUserId" = $1
          )
          AND NOT EXISTS (
            SELECT 1
            FROM blocks
            WHERE blocks."blockerId" = $1
            AND blocks."blockedUserId" = timeline_items.sharer_user_id
          )
        )
      )
      ORDER BY
        (
          (
            CASE
              WHEN COALESCE(timeline_items.sharer_user_id, timeline_items.author_user_id) = ANY($7::int[]) THEN 1.4
              WHEN COALESCE(timeline_items.sharer_user_id, timeline_items.author_user_id) = ANY($8::int[]) THEN 1.1
              ELSE 1.0
            END
          )
          * LN(1 + stats.reaction_count + (3 * stats.comment_count) + (6 * stats.share_count))
          * EXP(-(
            EXTRACT(EPOCH FROM (NOW() - timeline_items.created_at)) / 3600.0
          ) / 24.0)
        ) DESC,
        COALESCE(timeline_items.shared_at, timeline_items.created_at) DESC,
        (CASE WHEN timeline_items.shared_at IS NOT NULL THEN 2 ELSE 1 END) DESC,
        COALESCE(timeline_items.share_id, timeline_items.id) DESC
      LIMIT $4
    `;
    return await this.contentRepo.query<TimelineItem[]>(getFeedItemsQuery, [
      currentUserId,
      this.configService.getOrThrow<string>('STORAGE_URL'),
      ReactionTargetType.CONTENT,
      Number(this.configService.getOrThrow<number>('LIMIT_CONTENT_ITEM')),
      MediaTargetType.CONTENT,
      excludedContentIds,
      friendIds,
      followingIds,
      ContentType.POST,
    ]);
  }
  async getReelItems(
    currentUserId: number,
    excludedContentIds: number[],
    friendIds: number[],
    followingIds: number[],
  ) {
    const getReelItemsQuery = `
      WITH content_stats AS (
        SELECT
          contents.id as content_id,
          (
            SELECT COUNT(*) :: int
            FROM comments
            WHERE comments.content_id = contents.id
          ) as comment_count,
          (
            SELECT COUNT(*) :: int
            FROM saves
            WHERE saves.saved_content_id = contents.id
          ) as save_count,
          (
            SELECT COUNT(*) :: int
            FROM shares
            WHERE shares.shared_content_id = contents.id
          ) as share_count,
          (
            SELECT COUNT(*) :: int
            FROM reactions
            WHERE reactions.target_id = contents.id
            AND reactions.target_type = $3
          ) as reaction_count
        FROM contents
        WHERE contents.type = $10
      )
      SELECT
        contents.id as "id",
        contents.created_at as "createdAt",
        contents.updated_at as "updatedAt",
        contents.text as "text",
        contents.type as "type",
        contents.is_pinned as "isPinned",
        (contents.author_user_id = $1) as "isOwner",
        json_build_object(
          'username', author.username,
          'displayName', author.display_name,
          'avatarUrl', CONCAT($2::text, author.avatar_relative_path)
        ) as "author",
        mucs.mentionedUsers as "mentionedUsers",
        mf.mediaFiles as "mediaFiles",
        stats.comment_count as "commentNumber",
        stats.save_count as "saveNumber",
        stats.share_count as "shareNumber",
        stats.reaction_count as "reactionNumber",
        (
          SELECT EXISTS(
            SELECT 1
            FROM saves
            WHERE saves.saved_content_id = contents.id
            AND saves.saver_user_id = $1
          )
        ) AS "isSaved",
        (
          SELECT EXISTS(
            SELECT 1
            FROM shares
            WHERE shares.shared_content_id = contents.id
            AND shares.sharer_user_id = $1
          )
        ) AS "isShared",
        (
          SELECT reactions.type
          FROM reactions
          WHERE reactions.target_id = contents.id
          AND reactions.target_type = $3
          AND reactions.reacter_user_id = $1
          LIMIT 1
        ) AS "reaction"
      FROM contents
      INNER JOIN content_stats stats
      ON stats.content_id = contents.id
      LEFT JOIN users author
      ON author.id = contents.author_user_id
      LEFT JOIN LATERAL (
        SELECT
        COALESCE(
          json_agg(
            json_build_object(
              'username', mu.username,
              'displayName', mu.display_name,
              'avatarUrl', CONCAT($2::text, mu.avatar_relative_path)
            )
            ORDER BY mu.id
          ) FILTER (WHERE mu.id IS NOT NULL), '[]'::json
        ) as mentionedUsers
        FROM mentioned_user_content muc
        LEFT JOIN users mu
        ON mu.id = muc.user_id
        WHERE muc.content_id = contents.id
      ) mucs ON true
      LEFT JOIN LATERAL (
        SELECT
        COALESCE(
          json_agg(
            json_build_object(
              'url', CONCAT($2, mf.relative_path),
              'type', mf.type,
              'id', mf.id,
              'sortOrder', mf.sort_order
            )
            ORDER BY mf.sort_order
          ) FILTER (WHERE mf.id IS NOT NULL), '[]'::json
        ) as mediaFiles
        FROM media_files mf
        WHERE mf.target_id = contents.id
        AND mf.target_type = $5
      ) mf ON true
      WHERE contents.type = $10
      AND NOT (contents.id = ANY($7::int[]))
      AND (
        SELECT COUNT(*)
        FROM media_files mf_count
        WHERE mf_count.target_id = contents.id
        AND mf_count.target_type = $5
      ) = 1
      AND EXISTS (
        SELECT 1
        FROM media_files mf_video
        WHERE mf_video.target_id = contents.id
        AND mf_video.target_type = $5
        AND mf_video.type = $6
      )
      AND NOT EXISTS (
        SELECT 1
        FROM blocks
        WHERE blocks."blockerId" = contents.author_user_id
        AND blocks."blockedUserId" = $1
      )
      AND NOT EXISTS (
        SELECT 1
        FROM blocks
        WHERE blocks."blockerId" = $1
        AND blocks."blockedUserId" = contents.author_user_id
      )
      ORDER BY
        (
          (
            CASE
              WHEN contents.author_user_id = ANY($8::int[]) THEN 1.4
              WHEN contents.author_user_id = ANY($9::int[]) THEN 1.1
              ELSE 1.0
            END
          )
          * LN(1 + stats.reaction_count + (3 * stats.comment_count) + (6 * stats.share_count))
          * EXP(-(
            EXTRACT(EPOCH FROM (NOW() - contents.created_at)) / 3600.0
          ) / 24.0)
        ) DESC,
        contents.created_at DESC,
        contents.id DESC
      LIMIT $4
    `;
    return await this.contentRepo.query<ContentDetail[]>(getReelItemsQuery, [
      currentUserId,
      this.configService.getOrThrow<string>('STORAGE_URL'),
      ReactionTargetType.CONTENT,
      Number(this.configService.getOrThrow<number>('LIMIT_CONTENT_ITEM')),
      MediaTargetType.CONTENT,
      MediaType.VIDEO,
      excludedContentIds,
      friendIds,
      followingIds,
      ContentType.POST,
    ]);
  }
  async getSavedContents(currentUserId: number, cursor?: number) {
    let getSavedContentQuery = `
      SELECT
        saves.id as "saveId",
        saves.created_at as "savedAt",
        contents.id as "id",
        contents.created_at as "createdAt",
        contents.updated_at as "updatedAt",
        contents.is_pinned as "isPinned",
        (
          SELECT EXISTS(
            SELECT 1
            FROM shares
            WHERE shares.shared_content_id = contents.id
            AND shares.sharer_user_id = $1
          )
        ) as "isShared",
        (contents.author_user_id = $1) as "isOwner",
        json_build_object(
          'username', author.username,
          'displayName', author.display_name,
          'avatarUrl', CONCAT($2::text, author.avatar_relative_path)
        ) as "author",
        mucs.mentionedUsers as "mentionedUsers",
        contents.text as "text",
        mf.mediaFiles as "mediaFiles",
        contents.type as "type",
        (
          SELECT COUNT(*) :: int
          FROM comments
          WHERE comments.content_id = contents.id
        ) AS "commentNumber",
        (
          SELECT COUNT(*) :: int
          FROM saves
          WHERE saves.saved_content_id = contents.id
        ) AS "saveNumber",
        (
          SELECT COUNT(*) :: int
          FROM shares
          WHERE shares.shared_content_id = contents.id
        ) AS "shareNumber",
        (
          SELECT COUNT(*) :: int
          FROM reactions
          WHERE reactions.target_id = contents.id
          AND reactions.target_type = $3
        ) AS "reactionNumber",
        true as "isSaved",
        (
          SELECT reactions.type
          FROM reactions
          WHERE reactions.target_id = contents.id
          AND reactions.target_type = $3
          AND reactions.reacter_user_id = $1
          LIMIT 1
        ) AS "reaction"
      FROM saves
      INNER JOIN contents
      ON saves.saved_content_id = contents.id
      LEFT JOIN users author
      ON author.id = contents.author_user_id
      LEFT JOIN LATERAL (
        SELECT
        COALESCE(
          json_agg(
            json_build_object(
              'username', mu.username,
              'displayName', mu.display_name,
              'avatarUrl', CONCAT($2::text, mu.avatar_relative_path)
            )
          )FILTER (WHERE mu.id IS NOT NULL), '[]'::json
        ) as mentionedUsers
        FROM mentioned_user_content muc
        LEFT JOIN users mu
        ON mu.id = muc.user_id
        WHERE muc.content_id = contents.id
      ) mucs ON true
      LEFT JOIN LATERAL (
        SELECT
        COALESCE(
          json_agg(
            json_build_object(
              'url', CONCAT($2, mf.relative_path),
              'type', mf.type,
              'id', mf.id,
              'sortOrder', mf.sort_order
            )
          ) FILTER (WHERE mf.id IS NOT NULL), '[]'::json
        ) as mediaFiles
        FROM media_files mf
        WHERE mf.target_id = contents.id
        AND mf.target_type = $5
      ) mf ON true
      WHERE saves.saver_user_id = $1
    `;
    const params: Array<string | number> = [
      currentUserId,
      this.configService.getOrThrow<string>('STORAGE_URL'),
      ReactionTargetType.CONTENT,
      this.configService.getOrThrow<number>('LIMIT_CONTENT_ITEM'),
      MediaTargetType.CONTENT,
    ];
    if (cursor) {
      params.push(cursor);
      getSavedContentQuery += ` AND saves.id < $6`;
    }
    getSavedContentQuery += `
      ORDER BY saves.id DESC
      LIMIT $4
    `;
    return await this.contentRepo.query<SavedContent[]>(
      getSavedContentQuery,
      params,
    );
  }
  async searchPostContents(
    currentUserId: number,
    key: string,
    scoredAt: string | Date,
    cursor?: SearchContentCursor,
  ) {
    type SearchContentItem = ContentDetail & { recommendationScore: number };
    const limit = Number(
      this.configService.getOrThrow<number>('LIMIT_CONTENT_ITEM'),
    );
    const params: Array<string | number | Date> = [
      currentUserId,
      this.configService.getOrThrow<string>('STORAGE_URL'),
      ContentType.POST,
      ReactionTargetType.CONTENT,
      MediaTargetType.CONTENT,
      `%${key}%`,
      limit,
      scoredAt,
    ];
    let searchPostContentsQuery = `
      WITH content_stats AS (
        SELECT
          contents.id as content_id,
          (
            SELECT COUNT(*) :: int
            FROM comments
            WHERE comments.content_id = contents.id
          ) as comment_count,
          (
            SELECT COUNT(*) :: int
            FROM saves
            WHERE saves.saved_content_id = contents.id
          ) as save_count,
          (
            SELECT COUNT(*) :: int
            FROM shares
            WHERE shares.shared_content_id = contents.id
          ) as share_count,
          (
            SELECT COUNT(*) :: int
            FROM reactions
            WHERE reactions.target_id = contents.id
            AND reactions.target_type = $4
          ) as reaction_count
        FROM contents
        WHERE contents.type = $3
      ),
      search_posts AS (
      SELECT
        contents.id as "id",
        contents.created_at as "createdAt",
        contents.updated_at as "updatedAt",
        contents.text as "text",
        contents.type as "type",
        contents.is_pinned as "isPinned",
        (contents.author_user_id = $1) as "isOwner",
        json_build_object(
          'username', author.username,
          'displayName', author.display_name,
          'avatarUrl', CONCAT($2::text, author.avatar_relative_path)
        ) as "author",
        mucs.mentionedUsers as "mentionedUsers",
        mf.mediaFiles as "mediaFiles",
        (
          LN(
            1 + stats.reaction_count + (3 * stats.comment_count) + (6 * stats.share_count)
          )
          * EXP(-(
            EXTRACT(EPOCH FROM ($8::timestamptz - contents.created_at)) / 3600.0
          ) / 24.0)
        ) as "recommendationScore",
        stats.comment_count as "commentNumber",
        stats.save_count as "saveNumber",
        stats.share_count as "shareNumber",
        stats.reaction_count as "reactionNumber",
        (
          SELECT EXISTS(
            SELECT 1
            FROM saves
            WHERE saves.saved_content_id = contents.id
            AND saves.saver_user_id = $1
          )
        ) AS "isSaved",
        (
          SELECT EXISTS(
            SELECT 1
            FROM shares
            WHERE shares.shared_content_id = contents.id
            AND shares.sharer_user_id = $1
          )
        ) AS "isShared",
        (
          SELECT reactions.type
          FROM reactions
          WHERE reactions.target_id = contents.id
          AND reactions.target_type = $4
          AND reactions.reacter_user_id = $1
          LIMIT 1
        ) AS "reaction"
      FROM contents
      INNER JOIN content_stats stats
      ON stats.content_id = contents.id
      LEFT JOIN users author
      ON author.id = contents.author_user_id
      LEFT JOIN LATERAL (
        SELECT
        COALESCE(
          json_agg(
            json_build_object(
              'username', mu.username,
              'displayName', mu.display_name,
              'avatarUrl', CONCAT($2::text, mu.avatar_relative_path)
            )
            ORDER BY mu.id
          ) FILTER (WHERE mu.id IS NOT NULL), '[]'::json
        ) as mentionedUsers
        FROM mentioned_user_content muc
        LEFT JOIN users mu
        ON mu.id = muc.user_id
        WHERE muc.content_id = contents.id
      ) mucs ON true
      LEFT JOIN LATERAL (
        SELECT
        COALESCE(
          json_agg(
            json_build_object(
              'url', CONCAT($2, mf.relative_path),
              'type', mf.type,
              'id', mf.id,
              'sortOrder', mf.sort_order
            )
            ORDER BY mf.sort_order
          ) FILTER (WHERE mf.id IS NOT NULL), '[]'::json
        ) as mediaFiles
        FROM media_files mf
        WHERE mf.target_id = contents.id
        AND mf.target_type = $5
      ) mf ON true
      WHERE contents.type = $3
      AND (
        author.username ILIKE $6
        OR author.display_name ILIKE $6
        OR COALESCE(contents.text, '') ILIKE $6
      )
      AND NOT EXISTS (
        SELECT 1
        FROM blocks
        WHERE blocks."blockerId" = contents.author_user_id
        AND blocks."blockedUserId" = $1
      )
      AND NOT EXISTS (
        SELECT 1
        FROM blocks
        WHERE blocks."blockerId" = $1
        AND blocks."blockedUserId" = contents.author_user_id
      )
      )
      SELECT *
      FROM search_posts
    `;
    if (cursor) {
      params.push(cursor.recommendationScore, cursor.id);
      searchPostContentsQuery += `
      WHERE (
        "recommendationScore" < $9
        OR ("recommendationScore" = $9 AND "id" < $10)
      )`;
    }
    searchPostContentsQuery += `
      ORDER BY "recommendationScore" DESC, "id" DESC
      LIMIT $7
    `;
    return await this.contentRepo.query<SearchContentItem[]>(
      searchPostContentsQuery,
      params,
    );
  }
  async getCurrentStories(
    ownerUserId: number,
    currentUserId: number,
    cursor?: number,
  ) {
    // Fetch owner's current stories (within last 24 hours) in ContentDetail shape.
    const limit = Number(
      this.configService.getOrThrow<number>('LIMIT_CONTENT_ITEM'),
    );
    const params: Array<string | number> = [
      ownerUserId,
      this.configService.getOrThrow<string>('STORAGE_URL'),
      ContentType.STORY,
      MediaTargetType.CONTENT,
      ReactionTargetType.CONTENT,
      currentUserId,
      limit,
    ];
    let getCurrentStoriesQuery = `
      SELECT
        contents.id as "id",
        contents.created_at as "createdAt",
        contents.updated_at as "updatedAt",
        contents.text as "text",
        contents.type as "type",
        contents.is_pinned as "isPinned",
        (contents.author_user_id = $6) as "isOwner",
        json_build_object(
          'username', author.username,
          'displayName', author.display_name,
          'avatarUrl', CONCAT($2::text, author.avatar_relative_path)
        ) as "author",
        mucs.mentionedUsers as "mentionedUsers",
        mf.mediaFiles as "mediaFiles",
        (
          SELECT COUNT(*) :: int
          FROM comments
          WHERE comments.content_id = contents.id
        ) AS "commentNumber",
        (
          SELECT COUNT(*) :: int
          FROM saves
          WHERE saves.saved_content_id = contents.id
        ) AS "saveNumber",
        (
          SELECT COUNT(*) :: int
          FROM shares
          WHERE shares.shared_content_id = contents.id
        ) AS "shareNumber",
        (
          SELECT COUNT(*) :: int
          FROM reactions
          WHERE reactions.target_id = contents.id
          AND reactions.target_type = $5
        ) AS "reactionNumber",
        (
          SELECT EXISTS(
            SELECT 1
            FROM saves
            WHERE saves.saved_content_id = contents.id
            AND saves.saver_user_id = $6
          )
        ) AS "isSaved",
        (
          SELECT EXISTS(
            SELECT 1
            FROM shares
            WHERE shares.shared_content_id = contents.id
            AND shares.sharer_user_id = $6
          )
        ) AS "isShared",
        (
          SELECT reactions.type
          FROM reactions
          WHERE reactions.target_id = contents.id
          AND reactions.target_type = $5
          AND reactions.reacter_user_id = $6
          LIMIT 1
        ) AS "reaction"
      FROM contents
      LEFT JOIN users author
      ON author.id = contents.author_user_id
      LEFT JOIN LATERAL (
        SELECT
        COALESCE(
          json_agg(
            json_build_object(
              'username', mu.username,
              'displayName', mu.display_name,
              'avatarUrl', CONCAT($2::text, mu.avatar_relative_path)
            )
            ORDER BY mu.id
          ) FILTER (WHERE mu.id IS NOT NULL), '[]'::json
        ) as mentionedUsers
        FROM mentioned_user_content muc
        LEFT JOIN users mu
        ON mu.id = muc.user_id
        WHERE muc.content_id = contents.id
      ) mucs ON true
      LEFT JOIN LATERAL (
        SELECT
        COALESCE(
          json_agg(
            json_build_object(
              'url', CONCAT($2, mf.relative_path),
              'type', mf.type,
              'id', mf.id,
              'sortOrder', mf.sort_order
            )
            ORDER BY mf.sort_order
          ) FILTER (WHERE mf.id IS NOT NULL), '[]'::json
        ) as mediaFiles
        FROM media_files mf
        WHERE mf.target_id = contents.id
        AND mf.target_type = $4
      ) mf ON true
      WHERE contents.type = $3
      AND contents.author_user_id = $1
      AND contents.created_at >= NOW() - INTERVAL '24 hours'
    `;
    if (cursor) {
      params.push(cursor);
      getCurrentStoriesQuery += ` AND contents.id < $8`;
    }
    getCurrentStoriesQuery += `
      ORDER BY contents.id DESC
      LIMIT $7
    `;
    return await this.contentRepo.query<ContentDetail[]>(
      getCurrentStoriesQuery,
      params,
    );
  }
  async getMyStories(currentUserId: number, cursor?: number) {
    // Fetch all current user's stories in ContentDetail shape.
    const limit = Number(
      this.configService.getOrThrow<number>('LIMIT_CONTENT_ITEM'),
    );
    const params: Array<string | number> = [
      currentUserId,
      this.configService.getOrThrow<string>('STORAGE_URL'),
      ContentType.STORY,
      MediaTargetType.CONTENT,
      ReactionTargetType.CONTENT,
      limit,
    ];
    let getMyStoriesQuery = `
      SELECT
        contents.id as "id",
        contents.created_at as "createdAt",
        contents.updated_at as "updatedAt",
        contents.text as "text",
        contents.type as "type",
        contents.is_pinned as "isPinned",
        (contents.author_user_id = $1) as "isOwner",
        json_build_object(
          'username', author.username,
          'displayName', author.display_name,
          'avatarUrl', CONCAT($2::text, author.avatar_relative_path)
        ) as "author",
        mucs.mentionedUsers as "mentionedUsers",
        mf.mediaFiles as "mediaFiles",
        (
          SELECT COUNT(*) :: int
          FROM comments
          WHERE comments.content_id = contents.id
        ) AS "commentNumber",
        (
          SELECT COUNT(*) :: int
          FROM saves
          WHERE saves.saved_content_id = contents.id
        ) AS "saveNumber",
        (
          SELECT COUNT(*) :: int
          FROM shares
          WHERE shares.shared_content_id = contents.id
        ) AS "shareNumber",
        (
          SELECT COUNT(*) :: int
          FROM reactions
          WHERE reactions.target_id = contents.id
          AND reactions.target_type = $5
        ) AS "reactionNumber",
        (
          SELECT EXISTS(
            SELECT 1
            FROM saves
            WHERE saves.saved_content_id = contents.id
            AND saves.saver_user_id = $1
          )
        ) AS "isSaved",
        (
          SELECT EXISTS(
            SELECT 1
            FROM shares
            WHERE shares.shared_content_id = contents.id
            AND shares.sharer_user_id = $1
          )
        ) AS "isShared",
        (
          SELECT reactions.type
          FROM reactions
          WHERE reactions.target_id = contents.id
          AND reactions.target_type = $5
          AND reactions.reacter_user_id = $1
          LIMIT 1
        ) AS "reaction"
      FROM contents
      LEFT JOIN users author
      ON author.id = contents.author_user_id
      LEFT JOIN LATERAL (
        SELECT
        COALESCE(
          json_agg(
            json_build_object(
              'username', mu.username,
              'displayName', mu.display_name,
              'avatarUrl', CONCAT($2::text, mu.avatar_relative_path)
            )
            ORDER BY mu.id
          ) FILTER (WHERE mu.id IS NOT NULL), '[]'::json
        ) as mentionedUsers
        FROM mentioned_user_content muc
        LEFT JOIN users mu
        ON mu.id = muc.user_id
        WHERE muc.content_id = contents.id
      ) mucs ON true
      LEFT JOIN LATERAL (
        SELECT
        COALESCE(
          json_agg(
            json_build_object(
              'url', CONCAT($2, mf.relative_path),
              'type', mf.type,
              'id', mf.id,
              'sortOrder', mf.sort_order
            )
            ORDER BY mf.sort_order
          ) FILTER (WHERE mf.id IS NOT NULL), '[]'::json
        ) as mediaFiles
        FROM media_files mf
        WHERE mf.target_id = contents.id
        AND mf.target_type = $4
      ) mf ON true
      WHERE contents.type = $3
      AND contents.author_user_id = $1
    `;
    if (cursor) {
      params.push(cursor);
      getMyStoriesQuery += ` AND contents.id < $7`;
    }
    getMyStoriesQuery += `
      ORDER BY contents.id DESC
      LIMIT $6
    `;
    return await this.contentRepo.query<ContentDetail[]>(
      getMyStoriesQuery,
      params,
    );
  }
  async getFriendStories(currentUserId: number, cursor?: number) {
    // Fetch friend stories in ContentDetail shape.
    const limit = Number(
      this.configService.getOrThrow<number>('LIMIT_CONTENT_ITEM'),
    );
    const params: Array<string | number> = [
      currentUserId,
      this.configService.getOrThrow<string>('STORAGE_URL'),
      ContentType.STORY,
      FriendshipStatus.ACCEPTED,
      MediaTargetType.CONTENT,
      ReactionTargetType.CONTENT,
      limit,
    ];
    let getFriendStoriesQuery = `
      SELECT
        contents.id as "id",
        contents.created_at as "createdAt",
        contents.updated_at as "updatedAt",
        contents.text as "text",
        contents.type as "type",
        contents.is_pinned as "isPinned",
        (contents.author_user_id = $1) as "isOwner",
        json_build_object(
          'username', author.username,
          'displayName', author.display_name,
          'avatarUrl', CONCAT($2::text, author.avatar_relative_path)
        ) as "author",
        mucs.mentionedUsers as "mentionedUsers",
        mf.mediaFiles as "mediaFiles",
        (
          SELECT COUNT(*) :: int
          FROM comments
          WHERE comments.content_id = contents.id
        ) AS "commentNumber",
        (
          SELECT COUNT(*) :: int
          FROM saves
          WHERE saves.saved_content_id = contents.id
        ) AS "saveNumber",
        (
          SELECT COUNT(*) :: int
          FROM shares
          WHERE shares.shared_content_id = contents.id
        ) AS "shareNumber",
        (
          SELECT COUNT(*) :: int
          FROM reactions
          WHERE reactions.target_id = contents.id
          AND reactions.target_type = $6
        ) AS "reactionNumber",
        (
          SELECT EXISTS(
            SELECT 1
            FROM saves
            WHERE saves.saved_content_id = contents.id
            AND saves.saver_user_id = $1
          )
        ) AS "isSaved",
        (
          SELECT EXISTS(
            SELECT 1
            FROM shares
            WHERE shares.shared_content_id = contents.id
            AND shares.sharer_user_id = $1
          )
        ) AS "isShared",
        (
          SELECT reactions.type
          FROM reactions
          WHERE reactions.target_id = contents.id
          AND reactions.target_type = $6
          AND reactions.reacter_user_id = $1
          LIMIT 1
        ) AS "reaction"
      FROM contents
      LEFT JOIN users author
      ON author.id = contents.author_user_id
      LEFT JOIN LATERAL (
        SELECT
        COALESCE(
          json_agg(
            json_build_object(
              'username', mu.username,
              'displayName', mu.display_name,
              'avatarUrl', CONCAT($2::text, mu.avatar_relative_path)
            )
            ORDER BY mu.id
          ) FILTER (WHERE mu.id IS NOT NULL), '[]'::json
        ) as mentionedUsers
        FROM mentioned_user_content muc
        LEFT JOIN users mu
        ON mu.id = muc.user_id
        WHERE muc.content_id = contents.id
      ) mucs ON true
      LEFT JOIN LATERAL (
        SELECT
        COALESCE(
          json_agg(
            json_build_object(
              'url', CONCAT($2, mf.relative_path),
              'type', mf.type,
              'id', mf.id,
              'sortOrder', mf.sort_order
            )
            ORDER BY mf.sort_order
          ) FILTER (WHERE mf.id IS NOT NULL), '[]'::json
        ) as mediaFiles
        FROM media_files mf
        WHERE mf.target_id = contents.id
        AND mf.target_type = $5
      ) mf ON true
      WHERE contents.type = $3
      AND contents.created_at >= NOW() - INTERVAL '24 hours'
      AND contents.author_user_id IN (
        SELECT DISTINCT
          CASE
            WHEN friendships."requesterId" = $1 THEN friendships."recipientId"
            ELSE friendships."requesterId"
          END
        FROM friendships
        WHERE friendships.status = $4
        AND (
          friendships."requesterId" = $1
          OR friendships."recipientId" = $1
        )
      )
    `;
    if (cursor) {
      params.push(cursor);
      getFriendStoriesQuery += ` AND contents.id < $8`;
    }
    getFriendStoriesQuery += `
      ORDER BY contents.id DESC
      LIMIT $7
    `;
    return await this.contentRepo.query<ContentDetail[]>(
      getFriendStoriesQuery,
      params,
    );
  }
  async getPinnedStories(
    ownerUserId: number,
    currentUserId: number,
    cursor?: number,
  ) {
    // Fetch pinned stories in ContentDetail shape.
    const limit = Number(
      this.configService.getOrThrow<number>('LIMIT_CONTENT_ITEM'),
    );
    const params: Array<string | number> = [
      ownerUserId,
      this.configService.getOrThrow<string>('STORAGE_URL'),
      ContentType.STORY,
      MediaTargetType.CONTENT,
      ReactionTargetType.CONTENT,
      currentUserId,
      limit,
    ];
    let getPinnedStoriesQuery = `
      SELECT
        contents.id as "id",
        contents.created_at as "createdAt",
        contents.updated_at as "updatedAt",
        contents.text as "text",
        contents.type as "type",
        contents.is_pinned as "isPinned",
        (contents.author_user_id = $6) as "isOwner",
        json_build_object(
          'username', author.username,
          'displayName', author.display_name,
          'avatarUrl', CONCAT($2::text, author.avatar_relative_path)
        ) as "author",
        mucs.mentionedUsers as "mentionedUsers",
        mf.mediaFiles as "mediaFiles",
        (
          SELECT COUNT(*) :: int
          FROM comments
          WHERE comments.content_id = contents.id
        ) AS "commentNumber",
        (
          SELECT COUNT(*) :: int
          FROM saves
          WHERE saves.saved_content_id = contents.id
        ) AS "saveNumber",
        (
          SELECT COUNT(*) :: int
          FROM shares
          WHERE shares.shared_content_id = contents.id
        ) AS "shareNumber",
        (
          SELECT COUNT(*) :: int
          FROM reactions
          WHERE reactions.target_id = contents.id
          AND reactions.target_type = $5
        ) AS "reactionNumber",
        (
          SELECT EXISTS(
            SELECT 1
          FROM saves
          WHERE saves.saved_content_id = contents.id
            AND saves.saver_user_id = $6
          )
        ) AS "isSaved",
        (
          SELECT EXISTS(
            SELECT 1
          FROM shares
          WHERE shares.shared_content_id = contents.id
            AND shares.sharer_user_id = $6
          )
        ) AS "isShared",
        (
          SELECT reactions.type
          FROM reactions
          WHERE reactions.target_id = contents.id
          AND reactions.target_type = $5
          AND reactions.reacter_user_id = $6
          LIMIT 1
        ) AS "reaction"
      FROM contents
      LEFT JOIN users author
      ON author.id = contents.author_user_id
      LEFT JOIN LATERAL (
        SELECT
        COALESCE(
          json_agg(
            json_build_object(
              'username', mu.username,
              'displayName', mu.display_name,
              'avatarUrl', CONCAT($2::text, mu.avatar_relative_path)
            )
            ORDER BY mu.id
          ) FILTER (WHERE mu.id IS NOT NULL), '[]'::json
        ) as mentionedUsers
        FROM mentioned_user_content muc
        LEFT JOIN users mu
        ON mu.id = muc.user_id
        WHERE muc.content_id = contents.id
      ) mucs ON true
      LEFT JOIN LATERAL (
        SELECT
        COALESCE(
          json_agg(
            json_build_object(
              'url', CONCAT($2, mf.relative_path),
              'type', mf.type,
              'id', mf.id,
              'sortOrder', mf.sort_order
            )
            ORDER BY mf.sort_order
          ) FILTER (WHERE mf.id IS NOT NULL), '[]'::json
        ) as mediaFiles
        FROM media_files mf
        WHERE mf.target_id = contents.id
        AND mf.target_type = $4
      ) mf ON true
      WHERE contents.author_user_id = $1
      AND contents.type = $3
      AND contents.is_pinned = true
    `;
    if (cursor) {
      params.push(cursor);
      getPinnedStoriesQuery += ` AND contents.id < $8`;
    }
    getPinnedStoriesQuery += `
      ORDER BY contents.id DESC
      LIMIT $7
    `;
    return await this.contentRepo.query<ContentDetail[]>(
      getPinnedStoriesQuery,
      params,
    );
  }
  async findUserByUsername(username: string) {
    return await this.userRepo.findOne({ where: { username: username } });
  }
  async insertMedias(mediaFiles: MediaFileEntity[]) {
    return await this.mediaFileRepo.save(mediaFiles);
  }
  async findFollowingIds(userId: number) {
    const followingRows = await this.followRepo
      .createQueryBuilder('follow')
      .select('follow.followeeId', 'followeeId')
      .where('follow.followerId = :userId', { userId })
      .getRawMany<{ followeeId: number }>();
    return followingRows
      .map((followingRow) => Number(followingRow.followeeId))
      .filter((followeeId) => Number.isInteger(followeeId));
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
  async insertContent(insertedContent: Partial<ContentEntity>) {
    return await this.contentRepo.save(insertedContent);
  }
  async deleteContentById(contentId: number) {
    await this.contentRepo.delete({ id: contentId });
  }
  /**
   * Deletes a content and its media rows in one transaction.
   *
   * @param contentId Content id.
   * @returns TypeORM delete result of content row.
   */
  async deleteContentWithMediaById(contentId: number) {
    // Remove media rows first, then remove the post in the same transaction.
    return await this.contentRepo.manager.transaction(async (manager) => {
      const mediaFileRepository = manager.getRepository(MediaFileEntity);
      const contentRepository = manager.getRepository(ContentEntity);
      await mediaFileRepository.delete({
        targetType: MediaTargetType.CONTENT,
        targetId: contentId,
      });
      return await contentRepository.delete({
        id: contentId,
      });
    });
  }
  async findUserById(userId: number) {
    return await this.userRepo.findOne({ where: { id: userId } });
  }
  async findContentWithAuthorById(contentId: number) {
    return await this.contentRepo.findOne({
      where: { id: contentId },
      relations: { author: true },
    });
  }
  async findContentWithDetailById(contentId: number) {
    return await this.contentRepo.findOne({
      where: { id: contentId },
      relations: { author: true, mentionedUsers: true },
    });
  }
  async getContentDetailById(contentId: number, currentUserId: number) {
    const [contentDetail] = await this.contentRepo.query<ContentDetail[]>(
      `
      SELECT
        contents.id as "id",
        contents.created_at as "createdAt",
        contents.updated_at as "updatedAt",
        contents.text as "text",
        contents.type as "type",
        contents.is_pinned as "isPinned",
        (contents.author_user_id = $2) as "isOwner",
        json_build_object(
          'username', author.username,
          'displayName', author.display_name,
          'avatarUrl', CONCAT($3::text, author.avatar_relative_path)
        ) as "author",
        mucs.mentionedUsers as "mentionedUsers",
        mf.mediaFiles as "mediaFiles",
        (
          SELECT COUNT(*)::int
          FROM comments
          WHERE comments.content_id = contents.id
        ) AS "commentNumber",
        (
          SELECT COUNT(*)::int
          FROM saves
          WHERE saves.saved_content_id = contents.id
        ) AS "saveNumber",
        (
          SELECT COUNT(*)::int
          FROM shares
          WHERE shares.shared_content_id = contents.id
        ) AS "shareNumber",
        (
          SELECT COUNT(*)::int
          FROM reactions
          WHERE reactions.target_id = contents.id
          AND reactions.target_type = $4
        ) AS "reactionNumber",
        (
          SELECT EXISTS(
            SELECT 1
            FROM saves
            WHERE saves.saved_content_id = contents.id
            AND saves.saver_user_id = $2
          )
        ) AS "isSaved",
        (
          SELECT EXISTS(
            SELECT 1
            FROM shares
            WHERE shares.shared_content_id = contents.id
            AND shares.sharer_user_id = $2
          )
        ) AS "isShared",
        (
          SELECT reactions.type
          FROM reactions
          WHERE reactions.target_id = contents.id
          AND reactions.target_type = $4
          AND reactions.reacter_user_id = $2
          LIMIT 1
        ) AS "reaction"
      FROM contents
      LEFT JOIN users author
      ON author.id = contents.author_user_id
      LEFT JOIN LATERAL (
        SELECT
          COALESCE(
            json_agg(
              json_build_object(
                'username', mu.username,
                'displayName', mu.display_name,
                'avatarUrl', CONCAT($3::text, mu.avatar_relative_path)
              )
              ORDER BY mu.id
            ) FILTER (WHERE mu.id IS NOT NULL),
            '[]'::json
          ) as mentionedUsers
        FROM mentioned_user_content muc
        LEFT JOIN users mu
        ON mu.id = muc.user_id
        WHERE muc.content_id = contents.id
      ) mucs ON true
      LEFT JOIN LATERAL (
        SELECT
          COALESCE(
            json_agg(
              json_build_object(
                'url', CONCAT($3::text, mf.relative_path),
                'type', mf.type,
                'id', mf.id,
                'sortOrder', mf.sort_order
              )
              ORDER BY mf.sort_order
            ) FILTER (WHERE mf.id IS NOT NULL),
            '[]'::json
          ) as mediaFiles
        FROM media_files mf
        WHERE mf.target_id = contents.id
        AND mf.target_type = $5
      ) mf ON true
      WHERE contents.id = $1
      LIMIT 1
      `,
      [
        contentId,
        currentUserId,
        this.configService.getOrThrow<string>('STORAGE_URL'),
        ReactionTargetType.CONTENT,
        MediaTargetType.CONTENT,
      ],
    );
    if (!contentDetail) return null;
    return {
      ...contentDetail,
      commentNumber: Number(contentDetail.commentNumber ?? 0),
      saveNumber: Number(contentDetail.saveNumber ?? 0),
      shareNumber: Number(contentDetail.shareNumber ?? 0),
      reactionNumber: Number(contentDetail.reactionNumber ?? 0),
      isSaved: Boolean(contentDetail.isSaved),
      isShared: Boolean(contentDetail.isShared),
      reaction: contentDetail.reaction ?? null,
    };
  }
  /**
   * Returns all media files attached to a content item.
   *
   * @param contentId Content id.
   * @returns Sorted media files by `sortOrder` ascending.
   */
  async getContentMediaFilesByContentId(contentId: number) {
    return await this.mediaFileRepo.find({
      where: {
        targetType: MediaTargetType.CONTENT,
        targetId: contentId,
      },
      order: { sortOrder: 'ASC' },
    });
  }
  /**
   * Updates mutable fields of a post in one transaction.
   *
   * @param contentId Content id.
   * @param payload Optional update payload for text, mentioned users, and media files.
   */
  async updatePostContentById(
    contentId: number,
    payload: {
      text?: string | null;
      mentionedUserIds?: number[];
      mediaFiles?: MediaFileEntity[];
    },
  ) {
    // Update all mutable pieces atomically to avoid partial writes.
    await this.contentRepo.manager.transaction(async (manager) => {
      const contentRepository = manager.getRepository(ContentEntity);
      const mediaFileRepository = manager.getRepository(MediaFileEntity);
      if (payload.text !== undefined) {
        await contentRepository.update(
          { id: contentId },
          { text: payload.text },
        );
      }
      if (payload.mentionedUserIds !== undefined) {
        const existingMentionedUsers = await manager
          .createQueryBuilder()
          .relation(ContentEntity, 'mentionedUsers')
          .of(contentId)
          .loadMany<UserEntity>();

        const existingMentionedUserIdSet = new Set(
          existingMentionedUsers.map(
            (existingMentionedUser) => existingMentionedUser.id,
          ),
        );
        const nextMentionedUserIdSet = new Set(payload.mentionedUserIds);

        const removedMentionedUserIds = [...existingMentionedUserIdSet].filter(
          (existingMentionedUserId) =>
            !nextMentionedUserIdSet.has(existingMentionedUserId),
        );
        const addedMentionedUserIds = [...nextMentionedUserIdSet].filter(
          (nextMentionedUserId) =>
            !existingMentionedUserIdSet.has(nextMentionedUserId),
        );

        if (removedMentionedUserIds.length > 0) {
          await manager
            .createQueryBuilder()
            .relation(ContentEntity, 'mentionedUsers')
            .of(contentId)
            .remove(removedMentionedUserIds);
        }
        if (addedMentionedUserIds.length > 0) {
          await manager
            .createQueryBuilder()
            .relation(ContentEntity, 'mentionedUsers')
            .of(contentId)
            .add(addedMentionedUserIds);
        }
      }
      if (payload.mediaFiles !== undefined) {
        await mediaFileRepository.delete({
          targetType: MediaTargetType.CONTENT,
          targetId: contentId,
        });
        if (payload.mediaFiles.length > 0) {
          await mediaFileRepository.save(payload.mediaFiles);
        }
      }
    });
  }
  async updateIsPinnedToTrue(contentId: number) {
    return await this.contentRepo.update({ id: contentId }, { isPinned: true });
  }
  async updateIsPinnedToFalse(contentId: number) {
    return await this.contentRepo.update(
      { id: contentId },
      { isPinned: false },
    );
  }
  async checkHasPinnedPost(userId: number) {
    return await this.contentRepo.exists({
      where: {
        author: { id: userId },
        type: ContentType.POST,
        isPinned: true,
      },
    });
  }
  async findContentByIdAndUserId(contentId: number, userId: number) {
    return await this.contentRepo.findOne({
      where: { id: contentId, author: { id: userId } },
    });
  }
  async deleteMediaFilesByTargetTypeAndId(
    targetType: MediaTargetType,
    targetId: number,
  ) {
    return await this.mediaFileRepo.delete({
      targetType: targetType,
      targetId: targetId,
    });
  }
  async checkExistMediaFiles(relativePath: string[]) {
    const mediaExistCount = await this.mediaFileRepo.count({
      where: { relativePath: In(relativePath) },
    });
    return mediaExistCount === relativePath.length;
  }
}
