import { InjectRepository } from '@nestjs/typeorm';
import { ContentEntity } from '../entities/content.entity';
import { Brackets, Repository } from 'typeorm';
import { UserEntity } from '../entities/user.entity';
import { ConfigService } from '@nestjs/config';
import { TimelineItem } from './interface/timeline-item.interface';
import { SavedContent } from './interface/saved-content.interface';
import { ReactionTargetType } from '../enum/reactiontargettype.enum';
import { MediaTargetType } from '../enum/media-target-type.enum';
import { TimelineCursor } from './interface/timeline-cursor.interface';
import { BlockEntity } from '../entities/block.entity';
import { MediaFileEntity } from '../entities/media-file.entity';
import { FriendshipEntity } from '../entities/friendship.entity';
import { FriendshipStatus } from '../enum/friendshipstatus.enum';
import { PinnedContent } from './interface/pinned-content.interface';

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
      ORDER BY contents.id DESC
    `;
    return await this.contentRepo.query<PinnedContent[]>(
      getPinnedContentsQuery,
      [
        timelineOwnerId,
        this.configService.getOrThrow<string>('STORAGE_URL'),
        ReactionTargetType.CONTENT,
        MediaTargetType.CONTENT,
        currentUserId,
      ],
    );
  }
  async getTimelineContents(
    timelineOwnerId: number,
    currentUserId: number,
    cursor?: TimelineCursor,
  ) {
    let getTimelineContentQuery = `
      SELECT
        timeline_contents.content_id as "contentId",
        timeline_contents.timeline_item_id as "timelineItemId",
        timeline_contents.timeline_created_at as "timelineCreatedAt",
        timeline_contents.content_created_at as "contentCreatedAt",
        timeline_contents.content_updated_at as "contentUpdatedAt",
        timeline_contents.shared_at as "sharedAt",
        jto.timeline_owner as "timelineOwner",
        timeline_contents.timeline_item_type as "timelineItemType",
        (timeline_contents.timeline_owner_user_id = $6) as "isTimelineItemOwner",
        (
          SELECT EXISTS(
            SELECT 1
            FROM shares
            WHERE shares.shared_content_id = timeline_contents.content_id
            AND shares.sharer_user_id = $6
          )
        ) as "isShared",
        timeline_contents.shared_message as "sharedMessage",
        json_build_object(
          'username', author.username,
          'displayName', author.display_name,
          'avatarUrl', CONCAT($2::text, author.avatar_relative_path)
        ) as "author",
        mucs.mentionedUsers as "mentionedUsers",
        timeline_contents.text as "text",
        mf.mediaFiles as "mediaFiles",
        timeline_contents.type as "contentType",
        ( 
          SELECT COUNT(*) :: int
          FROM comments
          WHERE comments.content_id = timeline_contents.content_id
        ) AS "commentNumber",
        ( 
          SELECT COUNT(*) :: int
          FROM saves
          WHERE saves.saved_content_id = timeline_contents.content_id
        ) AS "saveNumber",
        (
          SELECT COUNT(*) :: int
          FROM shares
          WHERE shares.shared_content_id = timeline_contents.content_id
        ) AS "shareNumber",
        ( 
          SELECT COUNT(*) :: int
          FROM reactions
          WHERE reactions.target_id = timeline_contents.content_id
          AND reactions.target_type = $3
        ) AS "reactionNumber",
        (
          SELECT EXISTS(
            SELECT 1
            FROM saves
            WHERE saves.saved_content_id = timeline_contents.content_id
            AND saves.saver_user_id = $6
          )
        ) AS "isSaved",
        (
          SELECT reactions.type
          FROM reactions
          WHERE reactions.target_id = timeline_contents.content_id
          AND reactions.target_type = $3
          AND reactions.reacter_user_id = $6
          LIMIT 1
        ) AS "reaction"
      FROM 
      (
        SELECT 
          'create' as timeline_item_type,
          null as shared_message,
          contents.id as content_id,
          contents.id as timeline_item_id,
          contents.created_at as timeline_created_at,
          contents.author_user_id as timeline_owner_user_id,
          contents.created_at as content_created_at,
          contents.updated_at as content_updated_at,
          null::timestamptz as shared_at,
          contents.author_user_id,
          contents.text,
          contents.type
        FROM contents 
        WHERE contents.author_user_id = $1
        AND contents.is_pinned = false
        UNION 
        SELECT
          'share' as timeline_item_type, 
          shares.message as shared_message,
          shares.shared_content_id as content_id,
          shares.id as timeline_item_id,
          shares.created_at as timeline_created_at,
          shares.sharer_user_id as timeline_owner_user_id,
          shared_content.created_at as content_created_at,
          shared_content.updated_at as content_updated_at,
          shares.created_at as shared_at,
          shared_content.author_user_id,
          shared_content.text,
          shared_content.type
        FROM shares
        LEFT JOIN contents shared_content
        ON shares.shared_content_id = shared_content.id
        WHERE shares.sharer_user_id = $1
      ) as timeline_contents
      LEFT JOIN users author
      ON author.id = timeline_contents.author_user_id
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
        WHERE muc.content_id = timeline_contents.content_id
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
        WHERE mf.target_id = timeline_contents.content_id
        AND mf.target_type = $5
      ) mf ON true
       LEFT JOIN (
        SELECT 
          json_build_object(
            'username', u.username,
            'displayName', u.display_name,
            'avatarUrl', CONCAT($2, u.avatar_relative_path)
          ) as timeline_owner
        FROM users u
        WHERE u.id = $1
        LIMIT 1
       ) jto ON true
    `;
    const params: Array<string | number | Date> = [
      timelineOwnerId,
      this.configService.getOrThrow<string>('STORAGE_URL'),
      ReactionTargetType.CONTENT,
      this.configService.getOrThrow<number>('LIMIT_CONTENT_ITEM'),
      MediaTargetType.CONTENT,
      currentUserId,
    ];
    if (cursor) {
      const timelineTypeSort = cursor.timelineType === 'share' ? 2 : 1;
      params.push(
        cursor.timelineCreatedAt,
        timelineTypeSort,
        cursor.timelineId,
      );
      getTimelineContentQuery += `
      WHERE (
        timeline_contents.timeline_created_at < $7
        OR (
          timeline_contents.timeline_created_at = $7
          AND (CASE WHEN timeline_contents.timeline_item_type = 'share' THEN 2 ELSE 1 END) < $8
        )
        OR (
          timeline_contents.timeline_created_at = $7
          AND (CASE WHEN timeline_contents.timeline_item_type = 'share' THEN 2 ELSE 1 END) = $8
          AND timeline_contents.timeline_item_id < $9
        )
      )
    `;
    }
    getTimelineContentQuery += `
      ORDER BY
        timeline_contents.timeline_created_at DESC,
        (CASE WHEN timeline_contents.timeline_item_type = 'share' THEN 2 ELSE 1 END) DESC,
        timeline_contents.timeline_item_id DESC
      LIMIT $4
    `;
    const timelineContents = await this.contentRepo.query<TimelineItem[]>(
      getTimelineContentQuery,
      params,
    );
    return timelineContents;
  }
  async getSavedContents(currentUserId: number, cursor?: number) {
    let getSavedContentQuery = `
      SELECT
        saves.id as "saveId",
        saves.created_at as "savedAt",
        contents.id as "contentId",
        contents.created_at as "contentCreatedAt",
        contents.updated_at as "contentUpdatedAt",
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
  async findUserByUsername(username: string) {
    return await this.userRepo.findOne({ where: { username: username } });
  }
  async insertMedias(mediaFiles: MediaFileEntity[]) {
    return await this.mediaFileRepo.save(mediaFiles);
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
  async findUserById(userId: number) {
    return await this.userRepo.findOne({ where: { id: userId } });
  }
  async findContentWithAuthorById(contentId: number) {
    return await this.contentRepo.findOne({
      where: { id: contentId },
      relations: { author: true },
    });
  }
}
