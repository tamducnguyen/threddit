import { Injectable, Logger, Inject } from '@nestjs/common';
import {
  BaseServiceException,
  ContentCreatePostConfirmMediaFailedException,
  ContentCreatePostStoryMustHaveOneMediaException,
  ContentCreatePostTextOrMediaRequiredException,
  ContentCreatePostUserNotFoundException,
  ContentDeleteContentNotFoundException,
  ContentGetContentByKeyCursorInvalidException,
  ContentGetContentNotFoundException,
  ContentGetFriendStoryCursorInvalidException,
  ContentGetMyCurrentStoryCursorInvalidException,
  ContentGetMyStoryCursorInvalidException,
  ContentGetOtherCurrentStoryCursorInvalidException,
  ContentGetOtherCurrentStoryTargetUserBlockException,
  ContentGetOtherCurrentStoryUserNotFoundException,
  ContentGetPinnedStoryCursorInvalidException,
  ContentGetPinnedStoryTargetUserBlockException,
  ContentGetPinnedStoryUserNotFoundException,
  ContentGetSavedContentCursorInvalidException,
  ContentGetTimelineContentCursorInvalidException,
  ContentGetTimelineContentTargetUserBlockException,
  ContentGetTimelineContentUserNotFoundException,
  ContentPinContentAlreadyPinnedException,
  ContentPinContentNotFoundException,
  ContentPinContentOnlyOnePostAllowedException,
  ContentUnpinContentAlreadyUnpinnedException,
  ContentUnpinContentNotFoundException,
  ContentUpdateContentInvalidMediaKeyException,
  ContentUpdateContentNoFieldToUpdateException,
  ContentUpdateContentNotFoundException,
  ContentUpdateContentStoryMustHaveOneMediaException,
  ContentUpdateContentTextOrMediaRequiredException,
  ServiceExceptionClass,
} from '../../common/exception';
import { JwtService } from '@nestjs/jwt';
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
import { Cursor } from '../../common/interface/cursor.interface';
import { ContentType } from '../../enum/contenttype.enum';
import { ContentEntity } from '../../entities/content.entity';
import { MediaFileEntity } from '../../entities/media-file.entity';
import { MediaTargetType } from '../../enum/media-target-type.enum';
import { StorageService } from '../storage/storage.service';
import { ConvertMediaRelativePathToUrl } from '../../common/helper/media-url.helper';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { CreateContentDTO } from './dtos/create-content.dto';
import { ContentDetail } from './interface/content-detail.interface';
import { UpdateContentDTO } from './dtos/update-content.dto';
import { TimelineItem } from './interface/timeline-item.interface';
import { prefixCache, ttlCache } from '../../config/cache.config';
import { SearchContentCursor } from './interface/search-content-cursor.interface';

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
  /**
   * Enforce the bidirectional block rules between the current user and a
   * target user before exposing target-scoped data.
   *
   * - When the target has blocked the current user, hide the resource via
   *   `NotFound` so the user cannot probe the target's existence.
   * - When the current user has blocked the target, reject the request via
   *   `BadRequest` so the action is explicitly refused.
   *
   * Returns early for self-checks since a user cannot block themselves.
   */
  private async validateNotBlocked(
    currentUserId: number,
    targetUserId: number,
    BlockedByTargetException: ServiceExceptionClass,
    SelfBlockedTargetException: ServiceExceptionClass,
  ): Promise<void> {
    if (currentUserId === targetUserId) return;

    const [isBlockedByTarget, isTargetBlocked] = await Promise.all([
      this.contentRepo.checkBlocked(currentUserId, targetUserId),
      this.contentRepo.checkBlocked(targetUserId, currentUserId),
    ]);

    if (isBlockedByTarget) {
      throw new BlockedByTargetException();
    }
    if (isTargetBlocked) {
      throw new SelfBlockedTargetException();
    }
  }

  /**
   * Decode a signed cursor token and validate its payload shape.
   *
   * Returns `undefined` when no cursor is provided so callers can pass through
   * an optional `cursor` argument without an extra null check. Any verify or
   * `validate` failure is normalized into a single `cursor_invalid` BadRequest
   * response derived from the supplied message and error code.
   *
   * @param cursor Signed cursor token, or `undefined` for the first page.
   * @param cursorInvalidMessage Domain-specific cursor_invalid message.
   * @param cursorInvalidErrorCode Domain-specific cursor_invalid error code.
   * @param validate Optional payload-shape validator for extra runtime checks.
   */
  private async decodeCursor<T extends object>(
    cursor: string | undefined,
    CursorInvalidException: ServiceExceptionClass,
    validate?: (payload: T) => boolean,
  ): Promise<T | undefined> {
    if (!cursor) return undefined;
    try {
      const payload = await this.jwtService.verifyAsync<T>(cursor);
      if (validate && !validate(payload)) {
        throw new Error('invalid cursor payload');
      }
      return payload;
    } catch {
      throw new CursorInvalidException();
    }
  }
  async getSelfTimelineContents(currentUserId: number, cursor?: string) {
    let cursorDecoded: TimelineCursor | undefined;
    let pinnedContents: ContentDetail[] | undefined;
    if (cursor) {
      cursorDecoded = await this.decodeCursor<TimelineCursor>(
        cursor,
        ContentGetTimelineContentCursorInvalidException,
      );
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
        return {
          kind: 'no_content',
          data: { timelineItems: [], cursor: null },
        };
      }
      if ((pinnedContents?.length ?? 0) === 0) {
        return {
          kind: 'no_content',
          data: { pinnedContents: [], timelineItems: [], cursor: null },
        };
      }
      return {
        kind: 'success',
        data: {
          pinnedContents: pinnedContents,
          timelineItems: [],
          cursor: null,
        },
      };
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
      return {
        kind: 'success',
        data: {
          timelineItems: timelineItems,
          cursor: nextCursor,
        },
      };
    }
    return {
      kind: 'success',
      data: {
        timelineItems: timelineItems,
        pinnedContents: pinnedContents ?? [],
        cursor: nextCursor,
      },
    };
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
      throw new ContentGetTimelineContentUserNotFoundException();
    }
    //check if get self timeline
    if (currentUserId === timelineOwnerUser.id) {
      return await this.getSelfTimelineContents(currentUserId, cursor);
    }
    await this.validateNotBlocked(
      currentUserId,
      timelineOwnerUser.id,
      ContentGetTimelineContentUserNotFoundException,
      ContentGetTimelineContentTargetUserBlockException,
    );
    let cursorDecoded: TimelineCursor | undefined;
    let pinnedContents: ContentDetail[] | undefined;
    if (cursor) {
      cursorDecoded = await this.decodeCursor<TimelineCursor>(
        cursor,
        ContentGetTimelineContentCursorInvalidException,
      );
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
        return {
          kind: 'no_content',
          data: { timelineItems: [], cursor: null },
        };
      }
      if ((pinnedContents?.length ?? 0) === 0) {
        return {
          kind: 'no_content',
          data: { pinnedContents: [], timelineItems: [], cursor: null },
        };
      }
      return {
        kind: 'success',
        data: {
          pinnedContents: pinnedContents,
          timelineItems: [],
          cursor: null,
        },
      };
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
      return {
        kind: 'success',
        data: {
          timelineItems: timelineItems,
          cursor: nextCursor,
        },
      };
    }
    return {
      kind: 'success',
      data: {
        timelineItems: timelineItems,
        pinnedContents: pinnedContents ?? [],
        cursor: nextCursor,
      },
    };
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
      return {
        kind: 'no_content',
        data: {
          feedItems: [],
        },
      };
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
    return {
      kind: 'success',
      data: {
        feedItems: feedItems,
      },
    };
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
      return {
        kind: 'no_content',
        data: {
          reelItems: [],
        },
      };
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
    return {
      kind: 'success',
      data: {
        reelItems: reelItems,
      },
    };
  }
  async getSavedContents(currentUserId: number, cursor?: string) {
    const cursorDecoded = await this.decodeCursor<Cursor>(
      cursor,
      ContentGetSavedContentCursorInvalidException,
    );
    //get saved contents
    const savedContents = await this.contentRepo.getSavedContents(
      currentUserId,
      cursorDecoded?.id,
    );
    //check if no content
    const finalItem = savedContents[savedContents.length - 1];
    if (!finalItem) {
      return { kind: 'no_content', data: { savedContents: [], cursor: null } };
    }
    //sign cursor
    const cursorPayload: Cursor = { id: finalItem.saveId };
    const cursorToken = await this.jwtService.signAsync(cursorPayload);
    //send response
    return {
      kind: 'success',
      data: { savedContents: savedContents, cursor: cursorToken },
    };
  }
  async searchContents(currentUserId: number, key: string, cursor?: string) {
    const cursorDecoded = await this.decodeCursor<SearchContentCursor>(
      cursor,
      ContentGetContentByKeyCursorInvalidException,
      (payload) =>
        Number.isInteger(payload.id) &&
        typeof payload.recommendationScore === 'number' &&
        Number.isFinite(payload.recommendationScore) &&
        (payload.scoredAt instanceof Date ||
          typeof payload.scoredAt === 'string'),
    );
    const scoredAt = cursorDecoded?.scoredAt ?? new Date().toISOString();
    const contents = await this.contentRepo.searchPostContents(
      currentUserId,
      key,
      scoredAt,
      cursorDecoded,
    );
    const finalItem = contents[contents.length - 1];
    if (!finalItem) {
      return { kind: 'no_content', data: { contents: [], cursor: null } };
    }
    const nextCursor = await this.jwtService.signAsync({
      id: finalItem.id,
      recommendationScore: finalItem.recommendationScore,
      scoredAt: scoredAt,
    });
    return {
      kind: 'success',
      data: {
        contents: contents.map(
          //just remove recommendationScore from searchContent
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          ({ recommendationScore, ...content }) => content,
        ),
        cursor: nextCursor,
      },
    };
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
      throw new ContentCreatePostStoryMustHaveOneMediaException();
    }
    // Enforce business rule: post must contain text or media.
    if (!hasText && !hasMedia) {
      throw new ContentCreatePostTextOrMediaRequiredException();
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
      throw new ContentCreatePostUserNotFoundException();
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
      insertedMediaFiles = await this.storageService.attachUploadedMedia({
        ownerId: currentUserId,
        targetType: MediaTargetType.CONTENT,
        targetId: insertedContent.id,
        mediaKeys,
        persist: (entities) => this.contentRepo.insertMedias(entities),
      });
    } catch (error) {
      await this.contentRepo.deleteContentById(insertedContent.id);
      if (error instanceof BaseServiceException) {
        throw error;
      }
      this.logger.error(
        `Failed to create post ${insertedContent.id}.`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new ContentCreatePostConfirmMediaFailedException();
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
    return {
      kind: 'success',
      data: {
        createdPost: createdPost,
      },
    };
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
      throw new ContentUpdateContentNoFieldToUpdateException();
    }

    // Ensure target content exists and belongs to current user.
    const contentFound =
      await this.contentRepo.findContentWithDetailById(contentId);
    if (!contentFound || contentFound.author.id !== currentUserId) {
      throw new ContentUpdateContentNotFoundException();
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
      throw new ContentUpdateContentStoryMustHaveOneMediaException();
    }
    if (!finalText && finalMediaCount === 0) {
      throw new ContentUpdateContentTextOrMediaRequiredException();
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
        throw new ContentUpdateContentInvalidMediaKeyException();
      }

      // Every new temp media key must belong to current user and appear in upload session.
      for (const newTempMediaKey of newTempMediaKeys) {
        const mediaOwnerId = this.parseTempMediaOwnerId(newTempMediaKey);
        if (
          mediaOwnerId !== currentUserId ||
          !uploadedMediaKeySet.has(newTempMediaKey)
        ) {
          throw new ContentUpdateContentInvalidMediaKeyException();
        }
      }

      // Reject unknown keys that are neither existing media nor upload-session keys.
      const hasInvalidRequestedMediaKey = requestedMediaKeys.some(
        (requestedMediaKey) =>
          !existingMediaKeySet.has(requestedMediaKey) &&
          !uploadedMediaKeySet.has(requestedMediaKey),
      );
      if (hasInvalidRequestedMediaKey) {
        throw new ContentUpdateContentInvalidMediaKeyException();
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

      // Move all new temp objects to permanent keys; partial failures are
      // rolled back inside the helper before it rethrows.
      movedMediaPairs = await this.storageService.moveTempKeysToPermanent(
        newTempMediaKeys.map((newTempMediaKey) => ({
          tempKey: newTempMediaKey,
          destinationKey: this.storageService.getPermanentMediaKey(
            currentUserId,
            contentId,
          ),
        })),
      );

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
          throw new ContentUpdateContentInvalidMediaKeyException();
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
      await this.storageService.rollbackMovedMediaFiles(movedMediaPairs);
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
      throw new ContentUpdateContentNotFoundException();
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
    return {
      kind: 'success',
      data: {
        content: updatedContent,
      },
    };
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
    const cursorDecoded = await this.decodeCursor<Cursor>(
      cursor,
      ContentGetMyCurrentStoryCursorInvalidException,
    );
    const stories: ContentDetail[] = await this.contentRepo.getCurrentStories(
      currentUserId,
      currentUserId,
      cursorDecoded?.id,
    );
    const finalItem = stories[stories.length - 1];
    if (!finalItem) {
      return { kind: 'no_content', data: { stories: [], cursor: null } };
    }
    const cursorPayload: Cursor = { id: finalItem.id };
    const nextCursor = await this.jwtService.signAsync(cursorPayload);
    return {
      kind: 'success',
      data: {
        stories: stories,
        cursor: nextCursor,
      },
    };
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
      throw new ContentGetOtherCurrentStoryUserNotFoundException();
    }
    if (targetUser.id === currentUserId) {
      return await this.getMyCurrentStories(currentUserId, cursor);
    }
    await this.validateNotBlocked(
      currentUserId,
      targetUser.id,
      ContentGetOtherCurrentStoryUserNotFoundException,
      ContentGetOtherCurrentStoryTargetUserBlockException,
    );
    const cursorDecoded = await this.decodeCursor<Cursor>(
      cursor,
      ContentGetOtherCurrentStoryCursorInvalidException,
    );
    const stories: ContentDetail[] = await this.contentRepo.getCurrentStories(
      targetUser.id,
      currentUserId,
      cursorDecoded?.id,
    );
    const finalItem = stories[stories.length - 1];
    if (!finalItem) {
      return { kind: 'no_content', data: { stories: [], cursor: null } };
    }
    const cursorPayload: Cursor = { id: finalItem.id };
    const nextCursor = await this.jwtService.signAsync(cursorPayload);
    return {
      kind: 'success',
      data: {
        stories: stories,
        cursor: nextCursor,
      },
    };
  }
  /**
   * Returns current user's stories with cursor pagination.
   *
   * @param currentUserId Current authenticated user id.
   * @param cursor Signed cursor token from previous page.
   * @returns Current user's stories with next cursor.
   */
  async getMyStories(currentUserId: number, cursor?: string) {
    const cursorDecoded = await this.decodeCursor<Cursor>(
      cursor,
      ContentGetMyStoryCursorInvalidException,
    );
    const stories: ContentDetail[] = await this.contentRepo.getMyStories(
      currentUserId,
      cursorDecoded?.id,
    );
    const finalItem = stories[stories.length - 1];
    if (!finalItem) {
      return { kind: 'no_content', data: { stories: [], cursor: null } };
    }
    const cursorPayload: Cursor = { id: finalItem.id };
    const nextCursor = await this.jwtService.signAsync(cursorPayload);
    return {
      kind: 'success',
      data: {
        stories: stories,
        cursor: nextCursor,
      },
    };
  }
  /**
   * Returns paginated stories created by accepted friends.
   *
   * @param currentUserId Current authenticated user id.
   * @param cursor Signed cursor token from previous page.
   * @returns Stories with next cursor.
   */
  async getFriendStories(currentUserId: number, cursor?: string) {
    const cursorDecoded = await this.decodeCursor<Cursor>(
      cursor,
      ContentGetFriendStoryCursorInvalidException,
    );
    const stories: ContentDetail[] = await this.contentRepo.getFriendStories(
      currentUserId,
      cursorDecoded?.id,
    );
    const finalItem = stories[stories.length - 1];
    if (!finalItem) {
      return { kind: 'no_content', data: { stories: [], cursor: null } };
    }
    const cursorPayload: Cursor = { id: finalItem.id };
    const nextCursor = await this.jwtService.signAsync(cursorPayload);
    return {
      kind: 'success',
      data: {
        stories: stories,
        cursor: nextCursor,
      },
    };
  }
  /**
   * Returns paginated pinned stories of current user.
   *
   * @param currentUserId Current authenticated user id.
   * @param cursor Signed cursor token from previous page.
   * @returns Pinned stories with next cursor.
   */
  async getPinnedStories(currentUserId: number, cursor?: string) {
    const cursorDecoded = await this.decodeCursor<Cursor>(
      cursor,
      ContentGetPinnedStoryCursorInvalidException,
    );
    const pinnedStories: ContentDetail[] =
      await this.contentRepo.getPinnedStories(
        currentUserId,
        currentUserId,
        cursorDecoded?.id,
      );
    const finalItem = pinnedStories[pinnedStories.length - 1];
    if (!finalItem) {
      return { kind: 'no_content', data: { pinnedStories: [], cursor: null } };
    }
    const cursorPayload: Cursor = { id: finalItem.id };
    const nextCursor = await this.jwtService.signAsync(cursorPayload);
    return {
      kind: 'success',
      data: {
        pinnedStories: pinnedStories,
        cursor: nextCursor,
      },
    };
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
      throw new ContentGetPinnedStoryUserNotFoundException();
    }
    // Reuse self endpoint behavior when target is current user.
    if (targetUser.id === currentUserId) {
      return await this.getPinnedStories(currentUserId, cursor);
    }
    await this.validateNotBlocked(
      currentUserId,
      targetUser.id,
      ContentGetPinnedStoryUserNotFoundException,
      ContentGetPinnedStoryTargetUserBlockException,
    );
    // Decode pagination cursor when provided by client.
    const cursorDecoded = await this.decodeCursor<Cursor>(
      cursor,
      ContentGetPinnedStoryCursorInvalidException,
    );
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
      return { kind: 'no_content', data: { pinnedStories: [], cursor: null } };
    }
    // Generate next cursor from last item id for forward pagination.
    const cursorPayload: Cursor = { id: finalItem.id };
    const nextCursor = await this.jwtService.signAsync(cursorPayload);
    return {
      kind: 'success',
      data: {
        pinnedStories: pinnedStories,
        cursor: nextCursor,
      },
    };
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
      throw new ContentGetContentNotFoundException();
    }

    // Check both block directions between current user and author.
    await this.validateNotBlocked(
      currentUserId,
      contentFound.author.id,
      ContentGetContentNotFoundException,
      ContentGetTimelineContentTargetUserBlockException,
    );

    // Load full content detail payload after passing access checks.
    const content = await this.contentRepo.getContentDetailById(
      contentId,
      currentUserId,
    );

    // Safe fallback in case content is deleted between two queries.
    if (!content) {
      throw new ContentGetContentNotFoundException();
    }

    // Return successful content detail response.
    return {
      kind: 'success',
      data: {
        content,
      },
    };
  }
  async pinContent(currentUserId: number, contentId: number) {
    // Check if post exists and current user is its owner.
    const contentFound = await this.contentRepo.findContentByIdAndUserId(
      contentId,
      currentUserId,
    );
    if (!contentFound) {
      throw new ContentPinContentNotFoundException();
    }
    if (contentFound.isPinned) {
      throw new ContentPinContentAlreadyPinnedException();
    }
    // Enforce business rule: only one pinned post is allowed per user.
    if (contentFound.type === ContentType.POST) {
      const hasPinnedPost =
        await this.contentRepo.checkHasPinnedPost(currentUserId);
      if (hasPinnedPost) {
        throw new ContentPinContentOnlyOnePostAllowedException();
      }
    }
    // Pin post.
    await this.contentRepo.updateIsPinnedToTrue(contentId);
    return { kind: 'success' };
  }
  async unpinContent(currentUserId: number, contentId: number) {
    // Check if post exists and current user is its owner.
    const contentFound = await this.contentRepo.findContentByIdAndUserId(
      contentId,
      currentUserId,
    );
    if (!contentFound) {
      throw new ContentUnpinContentNotFoundException();
    }
    if (!contentFound.isPinned) {
      throw new ContentUnpinContentAlreadyUnpinnedException();
    }
    // Unpin post.
    await this.contentRepo.updateIsPinnedToFalse(contentId);
    return { kind: 'success' };
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
      throw new ContentDeleteContentNotFoundException();
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
    return { kind: 'success' };
  }
}
