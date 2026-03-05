import {
  BadRequestException,
  HttpStatus,
  InternalServerErrorException,
  Injectable,
  Logger,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { message } from '../common/helper/message.helper';
import { JwtService } from '@nestjs/jwt';
import { sendResponse } from '../common/helper/response.helper';
import type { Cache } from 'cache-manager';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  JobNotificationQueue,
  NameNotificationQueue,
} from '../notification/helper/notification.helper';
import { HttpsService } from '../http/http.service';
import { ConfigService } from '@nestjs/config';
import { ContentRepository } from './content.repository';
import { TimelineCursor } from './interface/timeline-cursor.interface';
import { Cursor } from '../interface/cursor.interface';
import { ContentType } from '../enum/contenttype.enum';
import { ContentEntity } from '../entities/content.entity';
import { MediaFileEntity } from '../entities/media-file.entity';
import { MediaTargetType } from '../enum/media-target-type.enum';
import { StorageService } from '../storage/storage.service';
import { ConvertMediaRelativePathToUrl } from '../common/helper/media-url.helper';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { CreateContentDTO } from './dtos/create-content.dto';
import { errorCode } from '../common/helper/errorcode.helper';
import { ContentDetail } from './interface/content-detail.interface';
import { UpdateContentDTO } from './dtos/update-content.dto';
import { TimelineItem } from './interface/timeline-item.interface';
import { prefixCache, ttlCache } from '../config/cache.config';

@Injectable()
export class ContentService {
  private readonly logger = new Logger(ContentService.name);
  constructor(
    private readonly contentRepo: ContentRepository,
    private readonly jwtService: JwtService,
    private readonly httpsService: HttpsService,
    @InjectQueue(NameNotificationQueue)
    private readonly notificationQueue: Queue,
    private readonly configService: ConfigService,
    private readonly storageService: StorageService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}
  private async decodeTimelineCursor(
    cursor: string,
  ): Promise<TimelineCursor | undefined> {
    if (!cursor) return undefined;
    try {
      return await this.jwtService.verifyAsync<TimelineCursor>(cursor);
    } catch {
      throw new BadRequestException(
        sendResponse(
          HttpStatus.BAD_REQUEST,
          message.content.get_timeline_content.cursor_invalid,
          undefined,
          errorCode.content.get_timeline_content.cursor_invalid,
        ),
      );
    }
  }
  async getSelfTimelineContents(currentUserId: number, cursor?: string) {
    let cursorDecoded: TimelineCursor | undefined;
    let pinnedContents: ContentDetail[] | undefined;
    if (cursor) {
      cursorDecoded = await this.decodeTimelineCursor(cursor);
    } else {
      cursorDecoded = undefined;
      pinnedContents = await this.contentRepo.getPinnedContents(
        currentUserId,
        currentUserId,
      );
    }
    const timelineItems = await this.contentRepo.getTimelineItems(
      currentUserId,
      currentUserId,
      cursorDecoded,
    );
    //check if there is any item
    const finalTimelineItem = timelineItems[timelineItems.length - 1];
    if (!finalTimelineItem) {
      if (cursor) {
        return sendResponse(
          HttpStatus.OK,
          message.content.get_timeline_content.no_content,
          { timelineItems: [], cursor: null },
        );
      }
      if ((pinnedContents?.length ?? 0) === 0) {
        return sendResponse(
          HttpStatus.OK,
          message.content.get_timeline_content.no_content,
          { pinnedContents: [], timelineItems: [], cursor: null },
        );
      }
      return sendResponse(
        HttpStatus.OK,
        message.content.get_timeline_content.success,
        { pinnedContents: pinnedContents, timelineItems: [], cursor: null },
      );
    }
    //sign cursor
    const cursorPayload: TimelineCursor = {
      timelineId:
        finalTimelineItem.shareId !== null
          ? finalTimelineItem.shareId
          : finalTimelineItem.id,
      timelineShareRank: finalTimelineItem.sharedAt !== null ? 2 : 1,
      timelineCreatedAt:
        finalTimelineItem.sharedAt !== null
          ? finalTimelineItem.sharedAt
          : finalTimelineItem.createdAt,
    };
    const nextCursor = await this.jwtService.signAsync(cursorPayload);
    if (cursor) {
      return sendResponse(
        HttpStatus.OK,
        message.content.get_timeline_content.success,
        {
          timelineItems: timelineItems,
          cursor: nextCursor,
        },
      );
    }
    return sendResponse(
      HttpStatus.OK,
      message.content.get_timeline_content.success,
      {
        timelineItems: timelineItems,
        pinnedContents: pinnedContents ?? [],
        cursor: nextCursor,
      },
    );
  }
  async getOtherTimelineContents(
    currentUserId: number,
    timelineOwnerUsername: string,
    cursor?: string,
  ) {
    //check if timeline owner user exist
    const timelineOwnerUser = await this.contentRepo.findUserByUsername(
      timelineOwnerUsername,
    );
    if (!timelineOwnerUser) {
      throw new NotFoundException(
        sendResponse(
          HttpStatus.NOT_FOUND,
          message.content.get_timeline_content.user_not_found,
          undefined,
          errorCode.content.get_timeline_content.user_not_found,
        ),
      );
    }
    //check if get self timeline
    if (currentUserId === timelineOwnerUser.id) {
      return await this.getSelfTimelineContents(currentUserId, cursor);
    }
    //check if current user got blocked by timeline owner user
    const [isBlockedByTarget, isTargetBlocked] = await Promise.all([
      this.contentRepo.checkBlocked(currentUserId, timelineOwnerUser.id),
      this.contentRepo.checkBlocked(timelineOwnerUser.id, currentUserId),
    ]);
    if (isBlockedByTarget) {
      throw new NotFoundException(
        sendResponse(
          HttpStatus.NOT_FOUND,
          message.content.get_timeline_content.user_not_found,
          undefined,
          errorCode.content.get_timeline_content.user_not_found,
        ),
      );
    }
    //check if current user blocked timeline owner
    if (isTargetBlocked) {
      throw new BadRequestException(
        sendResponse(
          HttpStatus.BAD_REQUEST,
          message.content.get_timeline_content.target_user_block,
          undefined,
          errorCode.content.get_timeline_content.target_user_block,
        ),
      );
    }
    let cursorDecoded: TimelineCursor | undefined;
    let pinnedContents: ContentDetail[] | undefined;
    if (cursor) {
      cursorDecoded = await this.decodeTimelineCursor(cursor);
    } else {
      cursorDecoded = undefined;
      pinnedContents = await this.contentRepo.getPinnedContents(
        timelineOwnerUser.id,
        currentUserId,
      );
    }
    const timelineItems = await this.contentRepo.getTimelineItems(
      timelineOwnerUser.id,
      currentUserId,
      cursorDecoded,
    );
    //check if there is any item
    const finalTimelineItem = timelineItems[timelineItems.length - 1];
    if (!finalTimelineItem) {
      if (cursor) {
        return sendResponse(
          HttpStatus.OK,
          message.content.get_timeline_content.no_content,
          { timelineItems: [], cursor: null },
        );
      }
      if ((pinnedContents?.length ?? 0) === 0) {
        return sendResponse(
          HttpStatus.OK,
          message.content.get_timeline_content.no_content,
          { pinnedContents: [], timelineItems: [], cursor: null },
        );
      }
      return sendResponse(
        HttpStatus.OK,
        message.content.get_timeline_content.success,
        { pinnedContents: pinnedContents, timelineItems: [], cursor: null },
      );
    }
    //sign cursor
    const cursorPayload: TimelineCursor = {
      timelineId:
        finalTimelineItem.shareId !== null
          ? finalTimelineItem.shareId
          : finalTimelineItem.id,
      timelineShareRank: finalTimelineItem.sharedAt !== null ? 2 : 1,
      timelineCreatedAt:
        finalTimelineItem.sharedAt !== null
          ? finalTimelineItem.sharedAt
          : finalTimelineItem.createdAt,
    };
    const nextCursor = await this.jwtService.signAsync(cursorPayload);
    if (cursor) {
      return sendResponse(
        HttpStatus.OK,
        message.content.get_timeline_content.success,
        {
          timelineItems: timelineItems,
          cursor: nextCursor,
        },
      );
    }
    return sendResponse(
      HttpStatus.OK,
      message.content.get_timeline_content.success,
      {
        timelineItems: timelineItems,
        pinnedContents: pinnedContents ?? [],
        cursor: nextCursor,
      },
    );
  }
  /**
   * Returns recommended feed items for the current user.
   *
   * Flow:
   * - read already-served content ids from cache to avoid duplicates
   * - load friend ids and following ids as affinity inputs for scoring
   * - query feed items from repository (score + block filtering are applied there)
   * - update served-id cache, capped by `MAX_CACHE_FEED_ITEM`
   * - return success or no_content response
   *
   * @param currentUserId Current authenticated user id.
   * @returns Standard response containing `feedItems`.
   */
  async getFeed(currentUserId: number) {
    // Read served content ids from cache to exclude them in this request.
    const feedCacheKey = `${prefixCache.feedalready}${currentUserId}`;
    const cachedFeedIdsRaw = await this.cacheManager.get<number[] | string[]>(
      feedCacheKey,
    );
    const cachedFeedIds = Array.isArray(cachedFeedIdsRaw)
      ? cachedFeedIdsRaw
          .map((cachedFeedId) => Number(cachedFeedId))
          .filter((cachedFeedId) => Number.isInteger(cachedFeedId))
      : [];

    // Load friends/followings in parallel for affinity scoring inputs.
    const [friends, followingIdsRaw] = await Promise.all([
      this.contentRepo.findFriends(currentUserId),
      this.contentRepo.findFollowingIds(currentUserId),
    ]);
    const friendIds = friends.map((friend) => friend.id);
    const followingIds = followingIdsRaw.filter(
      (followingId) => followingId !== currentUserId,
    );

    // Query feed items with block filters and excluded cached ids.
    const feedItems: TimelineItem[] = await this.contentRepo.getFeedItems(
      currentUserId,
      cachedFeedIds,
      friendIds,
      followingIds,
    );

    // Return no_content when there are no matching items.
    if (feedItems.length === 0) {
      return sendResponse(HttpStatus.OK, message.content.get_feed.no_content, {
        feedItems: [],
      });
    }

    // Resolve max number of ids stored in cache.
    const maxCacheFeedItemRaw = Number(
      this.configService.getOrThrow<number>('MAX_CACHE_FEED_ITEM'),
    );
    const maxCacheFeedItem =
      Number.isFinite(maxCacheFeedItemRaw) && maxCacheFeedItemRaw > 0
        ? Math.floor(maxCacheFeedItemRaw)
        : 100;

    // Merge new ids + cached ids, de-duplicate, and cap by cache size.
    const mergedFeedIds = [
      ...feedItems.map((feedItem) => feedItem.id),
      ...cachedFeedIds,
    ];
    const nextCachedFeedIds: number[] = [];
    const seenFeedIds = new Set<number>();
    for (const feedId of mergedFeedIds) {
      if (seenFeedIds.has(feedId)) continue;
      seenFeedIds.add(feedId);
      nextCachedFeedIds.push(feedId);
      if (nextCachedFeedIds.length >= maxCacheFeedItem) {
        break;
      }
    }

    // Persist updated served-id cache for next calls.
    await this.cacheManager.set(
      feedCacheKey,
      nextCachedFeedIds,
      ttlCache.feedalready,
    );

    // Return successful feed response.
    return sendResponse(HttpStatus.OK, message.content.get_feed.success, {
      feedItems: feedItems,
    });
  }

  /**
   * Returns recommended reels for the current user.
   *
   * A reel is defined as a `post` that has exactly one media item and that media is a video.
   * This rule is enforced in the repository query.
   *
   * Flow:
   * - read already-served reel ids from cache to avoid duplicates
   * - load friend ids and following ids as affinity inputs for scoring
   * - query reel items from repository (score + block filtering + reel condition)
   * - update served-id cache, capped by `MAX_CACHE_FEED_ITEM`
   * - return success or no_content response
   *
   * @param currentUserId Current authenticated user id.
   * @returns Standard response containing `reelItems`.
   */
  async getReel(currentUserId: number) {
    // Read served reel ids from cache to exclude them in this request.
    const reelCacheKey = `${prefixCache.reelalready}${currentUserId}`;
    const cachedReelIdsRaw = await this.cacheManager.get<number[] | string[]>(
      reelCacheKey,
    );
    const cachedReelIds = Array.isArray(cachedReelIdsRaw)
      ? cachedReelIdsRaw
          .map((cachedReelId) => Number(cachedReelId))
          .filter((cachedReelId) => Number.isInteger(cachedReelId))
      : [];

    // Load friends/followings in parallel for affinity scoring inputs.
    const [friends, followingIdsRaw] = await Promise.all([
      this.contentRepo.findFriends(currentUserId),
      this.contentRepo.findFollowingIds(currentUserId),
    ]);
    const friendIds = friends.map((friend) => friend.id);
    const followingIds = followingIdsRaw.filter(
      (followingId) => followingId !== currentUserId,
    );

    // Query reel items with block filters, reel condition, and excluded cached ids.
    const reelItems: ContentDetail[] = await this.contentRepo.getReelItems(
      currentUserId,
      cachedReelIds,
      friendIds,
      followingIds,
    );

    // Return no_content when there are no matching reels.
    if (reelItems.length === 0) {
      return sendResponse(HttpStatus.OK, message.content.get_reel.no_content, {
        reelItems: [],
      });
    }

    // Resolve max number of ids stored in cache.
    const maxCacheFeedItemRaw = Number(
      this.configService.getOrThrow<number>('MAX_CACHE_FEED_ITEM'),
    );
    const maxCacheFeedItem =
      Number.isFinite(maxCacheFeedItemRaw) && maxCacheFeedItemRaw > 0
        ? Math.floor(maxCacheFeedItemRaw)
        : 100;

    // Merge new ids + cached ids, de-duplicate, and cap by cache size.
    const mergedReelIds = [
      ...reelItems.map((reelItem) => reelItem.id),
      ...cachedReelIds,
    ];
    const nextCachedReelIds: number[] = [];
    const seenReelIds = new Set<number>();
    for (const reelId of mergedReelIds) {
      if (seenReelIds.has(reelId)) continue;
      seenReelIds.add(reelId);
      nextCachedReelIds.push(reelId);
      if (nextCachedReelIds.length >= maxCacheFeedItem) {
        break;
      }
    }

    // Persist updated served-reel-id cache for next calls.
    await this.cacheManager.set(
      reelCacheKey,
      nextCachedReelIds,
      ttlCache.reelalready,
    );

    // Return successful reel response.
    return sendResponse(HttpStatus.OK, message.content.get_reel.success, {
      reelItems: reelItems,
    });
  }
  async getSavedContents(currentUserId: number, cursor?: string) {
    //check if has cursor
    let cursorDecoded: Cursor | undefined;
    if (cursor) {
      try {
        cursorDecoded = await this.jwtService.verifyAsync<Cursor>(cursor);
      } catch {
        throw new BadRequestException(
          sendResponse(
            HttpStatus.BAD_REQUEST,
            message.content.get_saved_content.cursor_invalid,
            undefined,
            errorCode.content.get_saved_content.cursor_invalid,
          ),
        );
      }
    } else {
      cursorDecoded = undefined;
    }
    //get saved contents
    const savedContents = await this.contentRepo.getSavedContents(
      currentUserId,
      cursorDecoded?.id,
    );
    //check if no content
    const finalItem = savedContents[savedContents.length - 1];
    if (!finalItem) {
      return sendResponse(
        HttpStatus.OK,
        message.content.get_saved_content.no_content,
        { savedContents: [], cursor: null },
      );
    }
    //sign cursor
    const cursorPayload: Cursor = { id: finalItem.saveId };
    const cursorToken = await this.jwtService.signAsync(cursorPayload);
    //send response
    return sendResponse(
      HttpStatus.OK,
      message.content.get_saved_content.success,
      { savedContents: savedContents, cursor: cursorToken },
    );
  }
  /**
   * Creates a content item (post or story) for the current user.
   *
   * Flow:
   * - normalize payload and resolve uploaded media keys from upload session
   * - validate content rules:
   *   - content must have text or at least one media
   *   - story can contain at most one media file
   * - validate text toxicity when text is present
   * - resolve and validate mentioned users against friend list (only when mentions exist)
   * - create content record with requested content type
   * - attach uploaded media; rollback content on failure
   * - clear upload session cache
   * - enqueue notifications and return created post payload
   *
   * @param currentUserId Current authenticated user id.
   * @param createContentDTO Content payload from client
   * @returns Standard response containing created content detail.
   */
  async createContent(
    currentUserId: number,
    createContentDTO: CreateContentDTO,
  ) {
    // Normalize payload and resolve upload session keys.
    const { text, mentionedUsers, uploadSessionId, type } = createContentDTO;
    const normalizedText = text?.trim() ?? '';
    const hasText = normalizedText.length > 0;
    const mediaKeys =
      await this.storageService.validateAndResolveMediaKeysFromUploadSession(
        currentUserId,
        uploadSessionId,
      );
    const hasMedia = mediaKeys.length > 0;
    //Enforce bussiness rule: story must contain only one media
    if (type === ContentType.STORY && mediaKeys.length > 1) {
      throw new BadRequestException(
        sendResponse(
          HttpStatus.BAD_REQUEST,
          message.content.create_post.story_must_have_one_media,
          undefined,
          errorCode.content.create_post.story_must_have_one_media,
        ),
      );
    }
    // Enforce business rule: post must contain text or media.
    if (!hasText && !hasMedia) {
      throw new BadRequestException(
        sendResponse(
          HttpStatus.BAD_REQUEST,
          message.content.create_post.text_or_media_required,
          undefined,
          errorCode.content.create_post.text_or_media_required,
        ),
      );
    }
    // Validate text toxicity only when text exists.
    if (hasText) {
      await this.httpsService.checkToxic(normalizedText);
    }
    // Normalize mention input first so we can skip unnecessary DB reads.
    const mentionedUsernameSet = new Set(mentionedUsers ?? []);
    // Query friend list only when client sends at least one mentioned username.
    const validMentionedUsers =
      mentionedUsernameSet.size === 0
        ? []
        : (await this.contentRepo.findFriends(currentUserId)).filter((friend) =>
            mentionedUsernameSet.has(friend.username),
          );
    // Ensure current user exists before creating post.
    const author = await this.contentRepo.findUserById(currentUserId);
    if (!author) {
      throw new NotFoundException(
        sendResponse(
          HttpStatus.NOT_FOUND,
          message.content.create_post.user_not_found,
          undefined,
          errorCode.content.create_post.user_not_found,
        ),
      );
    }
    // Persist post record first, then attach media.
    const insertedContent = await this.contentRepo.insertContent({
      text: hasText ? normalizedText : null,
      type: type,
      mentionedUsers: validMentionedUsers,
      author: author,
    });
    // Attach uploaded media; rollback post on media processing failures.
    let insertedMediaFiles: MediaFileEntity[] = [];
    try {
      insertedMediaFiles = await this.attachUploadedMediaToContent(
        currentUserId,
        insertedContent.id,
        mediaKeys,
      );
    } catch (error) {
      await this.contentRepo.deleteContentById(insertedContent.id);
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      this.logger.error(
        `Failed to create post ${insertedContent.id}.`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException(
        sendResponse(
          HttpStatus.INTERNAL_SERVER_ERROR,
          message.content.create_post.confirm_media_failed,
          undefined,
          errorCode.content.create_post.confirm_media_failed,
        ),
      );
    }
    // Clear upload session cache after successful media attachment.
    if (uploadSessionId) {
      await this.cacheManager.del(uploadSessionId);
    }
    // Push notifications for followers/friends and mentioned users.
    this.enqueueCreateContentNotifications(
      insertedContent,
      author,
      validMentionedUsers,
    );
    // Build response payload with normalized media URLs and user summaries.
    const createdPost = this.buildCreatedContentResponse(
      insertedContent,
      author,
      validMentionedUsers,
      insertedMediaFiles,
    );
    // Return created post response.
    return sendResponse(
      HttpStatus.CREATED,
      message.content.create_post.success,
      {
        createdPost: createdPost,
      },
    );
  }
  /**
   * Updates a content owned by current user.
   *
   * Flow:
   * - validate ownership and update payload
   * - normalize text and validate toxicity when needed
   * - resolve mentioned users from friend list when provided
   * - validate media key list, move new temp media to permanent storage, rebuild sort order
   * - enforce business rules (text/media required, story max one media)
   * - persist update in transaction and return latest content detail
   *
   * @param currentUserId Current authenticated user id.
   * @param contentId Target content id.
   * @param updateContentDTO Partial update payload.
   * @returns Standard response containing updated content detail.
   */
  async updateContent(
    currentUserId: number,
    contentId: number,
    updateContentDTO: UpdateContentDTO,
  ) {
    const { text, mentionedUsers, mediaFiles, uploadSessionId } =
      updateContentDTO;
    const hasTextField = text !== undefined;
    const hasMentionedUsersField = mentionedUsers !== undefined;
    const hasMediaFilesField = mediaFiles !== undefined;

    // Reject request when client does not provide any mutable field.
    if (!hasTextField && !hasMentionedUsersField && !hasMediaFilesField) {
      throw new BadRequestException(
        sendResponse(
          HttpStatus.BAD_REQUEST,
          message.content.update_content.no_field_to_update,
          undefined,
          errorCode.content.update_content.no_field_to_update,
        ),
      );
    }

    // Ensure target content exists and belongs to current user.
    const contentFound =
      await this.contentRepo.findContentWithDetailById(contentId);
    if (!contentFound || contentFound.author.id !== currentUserId) {
      throw new NotFoundException(
        sendResponse(
          HttpStatus.NOT_FOUND,
          message.content.update_content.not_found,
          undefined,
          errorCode.content.update_content.not_found,
        ),
      );
    }

    // Load current media state for validation and media diff logic.
    const existingMediaFiles =
      await this.contentRepo.getContentMediaFilesByContentId(contentId);

    // Normalize text and run toxicity check only when text is provided and non-empty.
    const normalizedText = hasTextField ? (text?.trim() ?? '') : '';
    if (hasTextField && normalizedText.length > 0) {
      await this.httpsService.checkToxic(normalizedText);
    }

    // Compute final text/media state early to enforce business rules before file move.
    const finalText = hasTextField
      ? normalizedText.length > 0
        ? normalizedText
        : null
      : contentFound.text;
    const finalMediaCount = hasMediaFilesField
      ? (mediaFiles?.length ?? 0)
      : existingMediaFiles.length;
    if (contentFound.type === ContentType.STORY && finalMediaCount > 1) {
      throw new BadRequestException(
        sendResponse(
          HttpStatus.BAD_REQUEST,
          message.content.update_content.story_must_have_one_media,
          undefined,
          errorCode.content.update_content.story_must_have_one_media,
        ),
      );
    }
    if (!finalText && finalMediaCount === 0) {
      throw new BadRequestException(
        sendResponse(
          HttpStatus.BAD_REQUEST,
          message.content.update_content.text_or_media_required,
          undefined,
          errorCode.content.update_content.text_or_media_required,
        ),
      );
    }

    // Resolve mentioned users from friend list when client provides mention field.
    let validMentionedUserIds: number[] | undefined;
    let newMentionedUsers: Array<{ id: number; displayName: string }> = [];
    if (hasMentionedUsersField) {
      const mentionedUsernameSet = new Set(mentionedUsers ?? []);
      const validMentionedUsers =
        mentionedUsernameSet.size === 0
          ? []
          : (await this.contentRepo.findFriends(currentUserId)).filter(
              (friend) => mentionedUsernameSet.has(friend.username),
            );
      validMentionedUserIds = validMentionedUsers.map(
        (validMentionedUser) => validMentionedUser.id,
      );

      const currentMentionedUserIdSet = new Set(
        (contentFound.mentionedUsers ?? []).map(
          (contentMentionedUser) => contentMentionedUser.id,
        ),
      );
      newMentionedUsers = validMentionedUsers
        .filter(
          (validMentionedUser) =>
            !currentMentionedUserIdSet.has(validMentionedUser.id),
        )
        .map((newMentionedUser) => ({
          id: newMentionedUser.id,
          displayName: newMentionedUser.displayName,
        }));
    }

    // Prepare media update result and side-effect trackers for rollback/cleanup.
    let updatedMediaFiles: MediaFileEntity[] | undefined;
    let movedMediaPairs: Array<{ tempKey: string; destinationKey: string }> =
      [];
    let removedMediaKeys: string[] = [];

    // Rebuild media list only when client sends `mediaFiles`.
    if (hasMediaFilesField) {
      const requestedMediaKeys = [...(mediaFiles ?? [])]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((mediaFile) => mediaFile.mediaKey);
      const requestedMediaKeySet = new Set(requestedMediaKeys);

      // Index existing media by key for fast retained/new key detection.
      const existingMediaFileByKey = new Map(
        existingMediaFiles.map((existingMediaFile) => [
          existingMediaFile.relativePath,
          existingMediaFile,
        ]),
      );
      const existingMediaKeySet = new Set(existingMediaFileByKey.keys());

      const newTempMediaKeys = requestedMediaKeys.filter(
        (requestedMediaKey) => !existingMediaKeySet.has(requestedMediaKey),
      );

      // Resolve session keys only when request includes upload session id.
      const uploadedMediaKeys = uploadSessionId
        ? await this.storageService.validateAndResolveMediaKeysFromUploadSession(
            currentUserId,
            uploadSessionId,
          )
        : [];
      const uploadedMediaKeySet = new Set(uploadedMediaKeys);

      // Reject when client sends upload session id but does not append any new media key.
      if (uploadSessionId && newTempMediaKeys.length === 0) {
        throw new BadRequestException(
          sendResponse(
            HttpStatus.BAD_REQUEST,
            message.content.update_content.invalid_media_key,
            undefined,
            errorCode.content.update_content.invalid_media_key,
          ),
        );
      }

      // Every new temp media key must belong to current user and appear in upload session.
      for (const newTempMediaKey of newTempMediaKeys) {
        const mediaOwnerId = this.parseTempMediaOwnerId(newTempMediaKey);
        if (
          mediaOwnerId !== currentUserId ||
          !uploadedMediaKeySet.has(newTempMediaKey)
        ) {
          throw new BadRequestException(
            sendResponse(
              HttpStatus.BAD_REQUEST,
              message.content.update_content.invalid_media_key,
              undefined,
              errorCode.content.update_content.invalid_media_key,
            ),
          );
        }
      }

      // Reject unknown keys that are neither existing media nor upload-session keys.
      const hasInvalidRequestedMediaKey = requestedMediaKeys.some(
        (requestedMediaKey) =>
          !existingMediaKeySet.has(requestedMediaKey) &&
          !uploadedMediaKeySet.has(requestedMediaKey),
      );
      if (hasInvalidRequestedMediaKey) {
        throw new BadRequestException(
          sendResponse(
            HttpStatus.BAD_REQUEST,
            message.content.update_content.invalid_media_key,
            undefined,
            errorCode.content.update_content.invalid_media_key,
          ),
        );
      }

      // Validate uploaded temp objects and collect detected media type per key.
      const validatedNewMediaMetas =
        await this.storageService.validateUploadedMediaObjects(
          newTempMediaKeys,
        );
      const mediaTypeByTempKey = new Map(
        validatedNewMediaMetas.map((validatedNewMediaMeta) => [
          validatedNewMediaMeta.mediaKey,
          validatedNewMediaMeta.mediaType,
        ]),
      );

      // Move all new temp objects to permanent keys and wait for all results.
      const moveResults = await Promise.allSettled(
        newTempMediaKeys.map(async (newTempMediaKey) => {
          const destinationKey = this.storageService.getPermanentMediaKey(
            currentUserId,
            contentId,
          );
          await this.storageService.moveObject(newTempMediaKey, destinationKey);
          return { tempKey: newTempMediaKey, destinationKey };
        }),
      );
      movedMediaPairs = moveResults
        .filter(
          (
            moveResult,
          ): moveResult is PromiseFulfilledResult<{
            tempKey: string;
            destinationKey: string;
          }> => moveResult.status === 'fulfilled',
        )
        .map((moveResult) => moveResult.value);

      // Roll back already moved files when at least one move failed.
      const rejectedMove = moveResults.find(
        (moveResult): moveResult is PromiseRejectedResult =>
          moveResult.status === 'rejected',
      );
      if (rejectedMove) {
        await this.rollbackMovedMediaFiles(movedMediaPairs);
        throw rejectedMove.reason;
      }

      // Build lookup from temp key to permanent key for persistence.
      const destinationKeyByTempKey = new Map(
        movedMediaPairs.map((movedMediaPair) => [
          movedMediaPair.tempKey,
          movedMediaPair.destinationKey,
        ]),
      );

      // Build final media entity list in client-requested order.
      updatedMediaFiles = requestedMediaKeys.map((requestedMediaKey, index) => {
        const existingMediaFile = existingMediaFileByKey.get(requestedMediaKey);
        if (existingMediaFile) {
          return {
            targetType: MediaTargetType.CONTENT,
            targetId: contentId,
            type: existingMediaFile.type,
            relativePath: existingMediaFile.relativePath,
            sortOrder: index + 1,
          } as MediaFileEntity;
        }
        const destinationKey = destinationKeyByTempKey.get(requestedMediaKey);
        const mediaType = mediaTypeByTempKey.get(requestedMediaKey);
        if (!destinationKey || !mediaType) {
          throw new BadRequestException(
            sendResponse(
              HttpStatus.BAD_REQUEST,
              message.content.update_content.invalid_media_key,
              undefined,
              errorCode.content.update_content.invalid_media_key,
            ),
          );
        }
        return {
          targetType: MediaTargetType.CONTENT,
          targetId: contentId,
          type: mediaType,
          relativePath: destinationKey,
          sortOrder: index + 1,
        } as MediaFileEntity;
      });

      // Determine which old permanent media keys are removed from final list.
      removedMediaKeys = existingMediaFiles
        .filter(
          (existingMediaFile) =>
            !requestedMediaKeySet.has(existingMediaFile.relativePath),
        )
        .map((existingMediaFile) => existingMediaFile.relativePath);
    }

    // Build partial update payload only for fields that client requested.
    const updatePayload: {
      text?: string | null;
      mentionedUserIds?: number[];
      mediaFiles?: MediaFileEntity[];
    } = {};
    if (hasTextField) {
      updatePayload.text = finalText;
    }
    if (hasMentionedUsersField) {
      updatePayload.mentionedUserIds = validMentionedUserIds ?? [];
    }
    if (hasMediaFilesField) {
      updatePayload.mediaFiles = updatedMediaFiles ?? [];
    }

    // Persist update atomically; rollback moved files if DB write fails.
    try {
      await this.contentRepo.updatePostContentById(contentId, updatePayload);
    } catch (error) {
      await this.rollbackMovedMediaFiles(movedMediaPairs);
      throw error;
    }

    // Cleanup removed permanent media files in storage (best effort).
    if (removedMediaKeys.length > 0) {
      await Promise.allSettled(
        removedMediaKeys.map(async (removedMediaKey) => {
          await this.storageService.deleteObject(removedMediaKey);
        }),
      );
    }

    // Clear upload session cache after successful media update flow.
    if (hasMediaFilesField && uploadSessionId) {
      await this.cacheManager.del(uploadSessionId);
    }

    // Reload latest content detail for response payload.
    const updatedContent = await this.contentRepo.getContentDetailById(
      contentId,
      currentUserId,
    );
    if (!updatedContent) {
      throw new NotFoundException(
        sendResponse(
          HttpStatus.NOT_FOUND,
          message.content.update_content.not_found,
          undefined,
          errorCode.content.update_content.not_found,
        ),
      );
    }

    // Enqueue mention notification only for newly mentioned users.
    if (newMentionedUsers.length > 0) {
      this.enqueueMentionInContentNotification(
        { id: updatedContent.id, type: updatedContent.type },
        {
          id: contentFound.author.id,
          displayName: contentFound.author.displayName,
        },
        newMentionedUsers,
      );
    }

    // Return standardized update success response.
    return sendResponse(HttpStatus.OK, message.content.update_content.success, {
      content: updatedContent,
    });
  }

  private parseTempMediaOwnerId(mediaKey: string) {
    const mediaKeyPatternMatch = mediaKey.match(
      /^temp\/media\/(\d+)\/[^/]+\/\d+$/,
    );
    const ownerIdRaw = mediaKeyPatternMatch?.[1];
    if (!ownerIdRaw) return null;
    const ownerId = Number(ownerIdRaw);
    if (!Number.isInteger(ownerId)) return null;
    return ownerId;
  }
  private mapUserSummary(user: {
    username: string;
    displayName: string;
    avatarRelativePath: string;
  }) {
    return {
      username: user.username,
      displayName: user.displayName,
      avatarUrl: ConvertMediaRelativePathToUrl(
        this.configService,
        user.avatarRelativePath,
      ),
    };
  }

  private async rollbackMovedMediaFiles(
    movedMediaPairs: Array<{ tempKey: string; destinationKey: string }>,
  ) {
    if (movedMediaPairs.length === 0) return;
    await Promise.allSettled(
      movedMediaPairs.map(async ({ tempKey, destinationKey }) => {
        const movedObjectSize =
          await this.storageService.getObjectSize(destinationKey);
        if (movedObjectSize) {
          await this.storageService.moveObject(destinationKey, tempKey);
        }
      }),
    );
  }
  /**
   * Attaches uploaded media files to a content.
   *
   * Flow:
   * - parse and validate temporary media keys
   * - validate uploaded media objects in storage
   * - move objects from temp path to permanent path
   * - wait until every move settles before deciding rollback (race-safe)
   * - persist media metadata to database
   * - rollback moved objects if any step fails
   *
   * @param userId owner user id.
   * @param contentId Target content id.
   * @param mediaKeys Temporary media keys from upload session.
   * @returns Persisted media file entities for the content.
   */
  private async attachUploadedMediaToContent(
    userId: number,
    contentId: number,
    mediaKeys: string[],
  ): Promise<MediaFileEntity[]> {
    // Skip media attachment when request has no media keys.
    if (mediaKeys.length === 0) return [];
    // Validate uploaded objects (existence, size, and MIME type).
    const mediaMetas =
      await this.storageService.validateUploadedMediaObjects(mediaKeys);

    // Allocate a unique permanent key per media file to avoid key collisions.
    const mediaPayloads = mediaMetas.map(({ mediaKey, mediaType }, index) => {
      return {
        mediaKey,
        mediaType,
        sortOrder: index + 1,
        destinationKey: this.storageService.getPermanentMediaKey(
          userId,
          contentId,
        ),
      };
    });

    // Move all objects to permanent location and wait for every move to settle.
    const moveResults = await Promise.allSettled(
      mediaPayloads.map(async ({ mediaKey, destinationKey }) => {
        await this.storageService.moveObject(mediaKey, destinationKey);
        return { tempKey: mediaKey, destinationKey };
      }),
    );

    // Collect all successfully moved objects for potential rollback.
    const movedMediaPairs = moveResults
      .filter(
        (
          result,
        ): result is PromiseFulfilledResult<{
          tempKey: string;
          destinationKey: string;
        }> => result.status === 'fulfilled',
      )
      .map((result) => result.value);

    // If any move failed, rollback moved objects and surface the first failure.
    const rejectedMove = moveResults.find(
      (result): result is PromiseRejectedResult => result.status === 'rejected',
    );
    if (rejectedMove) {
      await this.rollbackMovedMediaFiles(movedMediaPairs);
      throw rejectedMove.reason;
    }
    // Persist media metadata only after all object moves completed successfully.
    try {
      const mediaFileEntities: MediaFileEntity[] = mediaPayloads.map(
        ({ mediaType, sortOrder, destinationKey }) =>
          ({
            targetType: MediaTargetType.CONTENT,
            targetId: contentId,
            relativePath: destinationKey,
            sortOrder: sortOrder,
            type: mediaType,
          }) as MediaFileEntity,
      );
      return await this.contentRepo.insertMedias(mediaFileEntities);
    } catch (error) {
      // Restore moved objects back to temp location when DB insert fails.
      await this.rollbackMovedMediaFiles(movedMediaPairs);
      throw error;
    }
  }
  private enqueueCreateContentNotifications(
    insertedContent: { id: number; type: ContentType },
    author: { id: number; displayName: string },
    validMentionedUsers: Array<{ id: number; displayName: string }>,
  ) {
    this.notificationQueue
      .add(
        JobNotificationQueue.CONTENT_CREATION,
        {
          createdContent: insertedContent,
          currentUser: author,
        },
        { priority: 3 },
      )
      .catch((error) => {
        this.logger.error(
          `Failed to enqueue content creation notification for content ${insertedContent.id}`,
          error instanceof Error ? error.stack : String(error),
        );
      });
    if (validMentionedUsers.length > 0) {
      this.enqueueMentionInContentNotification(
        insertedContent,
        author,
        validMentionedUsers,
      );
    }
  }
  private enqueueMentionInContentNotification(
    mentioningContent: { id: number; type: ContentType },
    author: { id: number; displayName: string },
    validMentionedUsers: Array<{ id: number; displayName: string }>,
  ) {
    this.notificationQueue
      .add(
        JobNotificationQueue.MENTION_IN_CONTENT,
        {
          currentUser: author,
          mentionedFriends: validMentionedUsers,
          mentioningContent: mentioningContent,
        },
        { priority: 2 },
      )
      .catch((error) => {
        this.logger.error(
          `Failed to enqueue mention notification for content ${mentioningContent.id}`,
          error instanceof Error ? error.stack : String(error),
        );
      });
  }
  private buildCreatedContentResponse(
    insertedContent: Partial<ContentEntity> & ContentEntity,
    author: {
      username: string;
      displayName: string;
      avatarRelativePath: string;
    },
    validMentionedUsers: Array<{
      username: string;
      displayName: string;
      avatarRelativePath: string;
    }>,
    insertedMediaFiles: MediaFileEntity[],
  ) {
    return {
      ...insertedContent,
      author: this.mapUserSummary(author),
      mentionedUsers: validMentionedUsers.map((mentionedUser) =>
        this.mapUserSummary(mentionedUser),
      ),
      mediaFiles: insertedMediaFiles.map((insertedMediaFile) => ({
        id: insertedMediaFile.id,
        type: insertedMediaFile.type,
        sortOrder: insertedMediaFile.sortOrder,
        url: ConvertMediaRelativePathToUrl(
          this.configService,
          insertedMediaFile.relativePath,
        ),
      })),
    };
  }
  /**
   * Returns current user's stories created within the last 24 hours.
   *
   * @param currentUserId Current authenticated user id.
   * @param cursor Signed cursor token from previous page.
   * @returns Current stories with next cursor.
   */
  async getMyCurrentStories(currentUserId: number, cursor?: string) {
    let cursorDecoded: Cursor | undefined;
    if (cursor) {
      try {
        cursorDecoded = await this.jwtService.verifyAsync<Cursor>(cursor);
      } catch {
        throw new BadRequestException(
          sendResponse(
            HttpStatus.BAD_REQUEST,
            message.content.get_my_current_story.cursor_invalid,
            undefined,
            errorCode.content.get_my_current_story.cursor_invalid,
          ),
        );
      }
    } else {
      cursorDecoded = undefined;
    }
    const stories: ContentDetail[] = await this.contentRepo.getCurrentStories(
      currentUserId,
      currentUserId,
      cursorDecoded?.id,
    );
    const finalItem = stories[stories.length - 1];
    if (!finalItem) {
      return sendResponse(
        HttpStatus.OK,
        message.content.get_my_current_story.no_content,
        { stories: [], cursor: null },
      );
    }
    const cursorPayload: Cursor = { id: finalItem.id };
    const nextCursor = await this.jwtService.signAsync(cursorPayload);
    return sendResponse(
      HttpStatus.OK,
      message.content.get_my_current_story.success,
      {
        stories: stories,
        cursor: nextCursor,
      },
    );
  }
  /**
   * Returns stories (within last 24 hours) of a target user visible to current user.
   *
   * @param currentUserId Current authenticated user id (viewer).
   * @param targetUsername Username whose current stories are requested.
   * @param cursor Signed pagination cursor from previous page.
   * @returns Standard response containing `{ stories, cursor }`.
   * @throws NotFoundException When target user does not exist or has blocked current user.
   * @throws BadRequestException When current user blocked target or cursor is invalid.
   */
  async getOtherCurrentStories(
    currentUserId: number,
    targetUsername: string,
    cursor?: string,
  ) {
    const targetUser =
      await this.contentRepo.findUserByUsername(targetUsername);
    if (!targetUser) {
      throw new NotFoundException(
        sendResponse(
          HttpStatus.NOT_FOUND,
          message.content.get_other_current_story.user_not_found,
          undefined,
          errorCode.content.get_other_current_story.user_not_found,
        ),
      );
    }
    if (targetUser.id === currentUserId) {
      return await this.getMyCurrentStories(currentUserId, cursor);
    }
    const [isBlockedByTarget, isTargetBlocked] = await Promise.all([
      this.contentRepo.checkBlocked(currentUserId, targetUser.id),
      this.contentRepo.checkBlocked(targetUser.id, currentUserId),
    ]);
    if (isBlockedByTarget) {
      throw new NotFoundException(
        sendResponse(
          HttpStatus.NOT_FOUND,
          message.content.get_other_current_story.user_not_found,
          undefined,
          errorCode.content.get_other_current_story.user_not_found,
        ),
      );
    }
    if (isTargetBlocked) {
      throw new BadRequestException(
        sendResponse(
          HttpStatus.BAD_REQUEST,
          message.content.get_other_current_story.target_user_block,
          undefined,
          errorCode.content.get_other_current_story.target_user_block,
        ),
      );
    }
    let cursorDecoded: Cursor | undefined;
    if (cursor) {
      try {
        cursorDecoded = await this.jwtService.verifyAsync<Cursor>(cursor);
      } catch {
        throw new BadRequestException(
          sendResponse(
            HttpStatus.BAD_REQUEST,
            message.content.get_other_current_story.cursor_invalid,
            undefined,
            errorCode.content.get_other_current_story.cursor_invalid,
          ),
        );
      }
    } else {
      cursorDecoded = undefined;
    }
    const stories: ContentDetail[] = await this.contentRepo.getCurrentStories(
      targetUser.id,
      currentUserId,
      cursorDecoded?.id,
    );
    const finalItem = stories[stories.length - 1];
    if (!finalItem) {
      return sendResponse(
        HttpStatus.OK,
        message.content.get_other_current_story.no_content,
        { stories: [], cursor: null },
      );
    }
    const cursorPayload: Cursor = { id: finalItem.id };
    const nextCursor = await this.jwtService.signAsync(cursorPayload);
    return sendResponse(
      HttpStatus.OK,
      message.content.get_other_current_story.success,
      {
        stories: stories,
        cursor: nextCursor,
      },
    );
  }
  /**
   * Returns current user's stories with cursor pagination.
   *
   * @param currentUserId Current authenticated user id.
   * @param cursor Signed cursor token from previous page.
   * @returns Current user's stories with next cursor.
   */
  async getMyStories(currentUserId: number, cursor?: string) {
    let cursorDecoded: Cursor | undefined;
    if (cursor) {
      try {
        cursorDecoded = await this.jwtService.verifyAsync<Cursor>(cursor);
      } catch {
        throw new BadRequestException(
          sendResponse(
            HttpStatus.BAD_REQUEST,
            message.content.get_my_story.cursor_invalid,
            undefined,
            errorCode.content.get_my_story.cursor_invalid,
          ),
        );
      }
    } else {
      cursorDecoded = undefined;
    }
    const stories: ContentDetail[] = await this.contentRepo.getMyStories(
      currentUserId,
      cursorDecoded?.id,
    );
    const finalItem = stories[stories.length - 1];
    if (!finalItem) {
      return sendResponse(
        HttpStatus.OK,
        message.content.get_my_story.no_content,
        { stories: [], cursor: null },
      );
    }
    const cursorPayload: Cursor = { id: finalItem.id };
    const nextCursor = await this.jwtService.signAsync(cursorPayload);
    return sendResponse(HttpStatus.OK, message.content.get_my_story.success, {
      stories: stories,
      cursor: nextCursor,
    });
  }
  /**
   * Returns paginated stories created by accepted friends.
   *
   * @param currentUserId Current authenticated user id.
   * @param cursor Signed cursor token from previous page.
   * @returns Stories with next cursor.
   */
  async getFriendStories(currentUserId: number, cursor?: string) {
    let cursorDecoded: Cursor | undefined;
    if (cursor) {
      try {
        cursorDecoded = await this.jwtService.verifyAsync<Cursor>(cursor);
      } catch {
        throw new BadRequestException(
          sendResponse(
            HttpStatus.BAD_REQUEST,
            message.content.get_friend_story.cursor_invalid,
            undefined,
            errorCode.content.get_friend_story.cursor_invalid,
          ),
        );
      }
    } else {
      cursorDecoded = undefined;
    }
    const stories: ContentDetail[] = await this.contentRepo.getFriendStories(
      currentUserId,
      cursorDecoded?.id,
    );
    const finalItem = stories[stories.length - 1];
    if (!finalItem) {
      return sendResponse(
        HttpStatus.OK,
        message.content.get_friend_story.no_content,
        { stories: [], cursor: null },
      );
    }
    const cursorPayload: Cursor = { id: finalItem.id };
    const nextCursor = await this.jwtService.signAsync(cursorPayload);
    return sendResponse(
      HttpStatus.OK,
      message.content.get_friend_story.success,
      {
        stories: stories,
        cursor: nextCursor,
      },
    );
  }
  /**
   * Returns paginated pinned stories of current user.
   *
   * @param currentUserId Current authenticated user id.
   * @param cursor Signed cursor token from previous page.
   * @returns Pinned stories with next cursor.
   */
  async getPinnedStories(currentUserId: number, cursor?: string) {
    let cursorDecoded: Cursor | undefined;
    if (cursor) {
      try {
        cursorDecoded = await this.jwtService.verifyAsync<Cursor>(cursor);
      } catch {
        throw new BadRequestException(
          sendResponse(
            HttpStatus.BAD_REQUEST,
            message.content.get_pinned_story.cursor_invalid,
            undefined,
            errorCode.content.get_pinned_story.cursor_invalid,
          ),
        );
      }
    } else {
      cursorDecoded = undefined;
    }
    const pinnedStories: ContentDetail[] =
      await this.contentRepo.getPinnedStories(
        currentUserId,
        currentUserId,
        cursorDecoded?.id,
      );
    const finalItem = pinnedStories[pinnedStories.length - 1];
    if (!finalItem) {
      return sendResponse(
        HttpStatus.OK,
        message.content.get_pinned_story.no_content,
        { pinnedStories: [], cursor: null },
      );
    }
    const cursorPayload: Cursor = { id: finalItem.id };
    const nextCursor = await this.jwtService.signAsync(cursorPayload);
    return sendResponse(
      HttpStatus.OK,
      message.content.get_pinned_story.success,
      {
        pinnedStories: pinnedStories,
        cursor: nextCursor,
      },
    );
  }
  /**
   * Returns paginated pinned stories of a target user visible to current user.
   *
   * Flow:
   * - resolve target user by username
   * - short-circuit to self endpoint when requesting own username
   * - enforce block rules in both directions
   * - decode and validate cursor token
   * - query pinned stories with viewer-aware interaction flags
   * - build next cursor from last item and return paginated payload
   *
   * @param currentUserId Current authenticated user id (viewer).
   * @param targetUsername Username whose pinned stories are requested.
   * @param cursor Signed pagination cursor from previous page.
   * @returns Standard response containing `{ pinnedStories, cursor }`.
   * @throws NotFoundException When target user does not exist or has blocked current user.
   * @throws BadRequestException When current user blocked target or cursor is invalid.
   */
  async getOtherPinnedStories(
    currentUserId: number,
    targetUsername: string,
    cursor?: string,
  ) {
    // Resolve target user first to validate username.
    const targetUser =
      await this.contentRepo.findUserByUsername(targetUsername);
    // Hide resource when target user does not exist.
    if (!targetUser) {
      throw new NotFoundException(
        sendResponse(
          HttpStatus.NOT_FOUND,
          message.content.get_pinned_story.user_not_found,
          undefined,
          errorCode.content.get_pinned_story.user_not_found,
        ),
      );
    }
    // Reuse self endpoint behavior when target is current user.
    if (targetUser.id === currentUserId) {
      return await this.getPinnedStories(currentUserId, cursor);
    }
    // Evaluate both block directions in parallel for access control.
    const [isBlockedByTarget, isTargetBlocked] = await Promise.all([
      this.contentRepo.checkBlocked(currentUserId, targetUser.id),
      this.contentRepo.checkBlocked(targetUser.id, currentUserId),
    ]);
    // Hide target data when current user is blocked by target.
    if (isBlockedByTarget) {
      throw new NotFoundException(
        sendResponse(
          HttpStatus.NOT_FOUND,
          message.content.get_pinned_story.user_not_found,
          undefined,
          errorCode.content.get_pinned_story.user_not_found,
        ),
      );
    }
    // Reject access when current user blocked target account.
    if (isTargetBlocked) {
      throw new BadRequestException(
        sendResponse(
          HttpStatus.BAD_REQUEST,
          message.content.get_pinned_story.target_user_block,
          undefined,
          errorCode.content.get_pinned_story.target_user_block,
        ),
      );
    }
    // Decode pagination cursor when provided by client.
    let cursorDecoded: Cursor | undefined;
    if (cursor) {
      try {
        cursorDecoded = await this.jwtService.verifyAsync<Cursor>(cursor);
      } catch {
        // Normalize invalid token into a domain-level cursor error response.
        throw new BadRequestException(
          sendResponse(
            HttpStatus.BAD_REQUEST,
            message.content.get_pinned_story.cursor_invalid,
            undefined,
            errorCode.content.get_pinned_story.cursor_invalid,
          ),
        );
      }
    } else {
      cursorDecoded = undefined;
    }
    // Query pinned stories where owner is target user and viewer is current user.
    const pinnedStories: ContentDetail[] =
      await this.contentRepo.getPinnedStories(
        targetUser.id,
        currentUserId,
        cursorDecoded?.id,
      );
    // Return empty payload with null cursor when no more items.
    const finalItem = pinnedStories[pinnedStories.length - 1];
    if (!finalItem) {
      return sendResponse(
        HttpStatus.OK,
        message.content.get_pinned_story.no_content,
        { pinnedStories: [], cursor: null },
      );
    }
    // Generate next cursor from last item id for forward pagination.
    const cursorPayload: Cursor = { id: finalItem.id };
    const nextCursor = await this.jwtService.signAsync(cursorPayload);
    return sendResponse(
      HttpStatus.OK,
      message.content.get_pinned_story.success,
      {
        pinnedStories: pinnedStories,
        cursor: nextCursor,
      },
    );
  }
  /**
   * Gets a single content detail by id for the current user.
   *
   * Flow:
   * - validate that the content exists
   * - enforce block rules between current user and content author
   * - load full content detail payload
   * - return standard success response
   *
   * @param currentUserId Current authenticated user id.
   * @param contentId Target content id from path param.
   * @returns Standard response containing content detail.
   */
  async getContent(currentUserId: number, contentId: number) {
    // Load minimal content + author to validate existence and block rules.
    const contentFound =
      await this.contentRepo.findContentWithAuthorById(contentId);

    // If content does not exist, return not found.
    if (!contentFound) {
      throw new NotFoundException(
        sendResponse(
          HttpStatus.NOT_FOUND,
          message.content.get_content.not_found,
          undefined,
          errorCode.content.get_content.not_found,
        ),
      );
    }

    // Check both block directions between current user and author.
    const [isBlockedByAuthor, isAuthorBlocked] = await Promise.all([
      this.contentRepo.checkBlocked(currentUserId, contentFound.author.id),
      this.contentRepo.checkBlocked(contentFound.author.id, currentUserId),
    ]);

    // Hide content when current user is blocked by author.
    if (isBlockedByAuthor) {
      throw new NotFoundException(
        sendResponse(
          HttpStatus.NOT_FOUND,
          message.content.get_content.not_found,
          undefined,
          errorCode.content.get_content.not_found,
        ),
      );
    }

    // Reject request when current user already blocked the author.
    if (isAuthorBlocked) {
      throw new BadRequestException(
        sendResponse(
          HttpStatus.BAD_REQUEST,
          message.content.get_timeline_content.target_user_block,
          undefined,
          errorCode.content.get_timeline_content.target_user_block,
        ),
      );
    }

    // Load full content detail payload after passing access checks.
    const content = await this.contentRepo.getContentDetailById(
      contentId,
      currentUserId,
    );

    // Safe fallback in case content is deleted between two queries.
    if (!content) {
      throw new NotFoundException(
        sendResponse(
          HttpStatus.NOT_FOUND,
          message.content.get_content.not_found,
          undefined,
          errorCode.content.get_content.not_found,
        ),
      );
    }

    // Return successful content detail response.
    return sendResponse(HttpStatus.OK, message.content.get_content.success, {
      content,
    });
  }
  async pinContent(currentUserId: number, contentId: number) {
    // Check if post exists and current user is its owner.
    const contentFound = await this.contentRepo.findContentByIdAndUserId(
      contentId,
      currentUserId,
    );
    if (!contentFound) {
      throw new NotFoundException(
        sendResponse(
          HttpStatus.NOT_FOUND,
          message.content.pin_content.not_found,
          undefined,
          errorCode.content.pin_content.not_found,
        ),
      );
    }
    if (contentFound.isPinned) {
      throw new BadRequestException(
        sendResponse(
          HttpStatus.BAD_REQUEST,
          message.content.pin_content.already_pinned,
          undefined,
          errorCode.content.pin_content.already_pinned,
        ),
      );
    }
    // Enforce business rule: only one pinned post is allowed per user.
    if (contentFound.type === ContentType.POST) {
      const hasPinnedPost =
        await this.contentRepo.checkHasPinnedPost(currentUserId);
      if (hasPinnedPost) {
        throw new BadRequestException(
          sendResponse(
            HttpStatus.BAD_REQUEST,
            message.content.pin_content.only_one_post_allowed,
            undefined,
            errorCode.content.pin_content.only_one_post_allowed,
          ),
        );
      }
    }
    // Pin post.
    await this.contentRepo.updateIsPinnedToTrue(contentId);
    return sendResponse(HttpStatus.OK, message.content.pin_content.success);
  }
  async unpinContent(currentUserId: number, contentId: number) {
    // Check if post exists and current user is its owner.
    const contentFound = await this.contentRepo.findContentByIdAndUserId(
      contentId,
      currentUserId,
    );
    if (!contentFound) {
      throw new NotFoundException(
        sendResponse(
          HttpStatus.NOT_FOUND,
          message.content.unpin_content.not_found,
          undefined,
          errorCode.content.unpin_content.not_found,
        ),
      );
    }
    if (!contentFound.isPinned) {
      throw new BadRequestException(
        sendResponse(
          HttpStatus.BAD_REQUEST,
          message.content.unpin_content.already_unpinned,
          undefined,
          errorCode.content.unpin_content.already_unpinned,
        ),
      );
    }
    // Unpin post.
    await this.contentRepo.updateIsPinnedToFalse(contentId);
    return sendResponse(HttpStatus.OK, message.content.unpin_content.success);
  }
  /**
   * Deletes a post owned by current user.
   *
   * Flow:
   * - verify ownership
   * - delete post and media rows in DB transaction
   * - cleanup media objects in storage (best effort)
   *
   * @param currentUserId Current authenticated user id.
   * @param contentId Target post id.
   * @returns Standard success response.
   */
  async deleteContent(currentUserId: number, contentId: number) {
    // Ensure the post exists and belongs to current user.
    const contentFound = await this.contentRepo.findContentByIdAndUserId(
      contentId,
      currentUserId,
    );
    if (!contentFound) {
      throw new NotFoundException(
        sendResponse(
          HttpStatus.NOT_FOUND,
          message.content.delete_content.not_found,
          undefined,
          errorCode.content.delete_content.not_found,
        ),
      );
    }
    // Capture media paths before DB delete to cleanup storage afterwards.
    const mediaFiles =
      await this.contentRepo.getContentMediaFilesByContentId(contentId);
    // Delete DB records in transaction (media rows + post row).
    await this.contentRepo.deleteContentWithMediaById(contentId);
    // Delete storage objects in best-effort mode (do not fail API on cleanup error).
    await Promise.allSettled(
      mediaFiles.map(async (mediaFile) => {
        await this.storageService.deleteObject(mediaFile.relativePath);
      }),
    );
    return sendResponse(HttpStatus.OK, message.content.delete_content.success);
  }
}
