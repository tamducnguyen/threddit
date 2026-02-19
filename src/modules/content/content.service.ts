import {
  BadRequestException,
  HttpStatus,
  InternalServerErrorException,
  Injectable,
  Logger,
  NotFoundException,
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
import { CreatePostDTO } from './dtos/create-post.dto';
import { ConfirmUploadContentMediaDTO } from './dtos/confirm-upload-content-media.dto';
import { PinnedContent } from './interface/pinned-content.interface';
import { ContentEntity } from '../entities/content.entity';
import { ContentType } from '../enum/contenttype.enum';
import { StorageService } from '../storage/storage.service';
import { ConvertMediaRelativePathToUrl } from '../common/helper/media-url.helper';
import { MediaFileEntity } from '../entities/media-file.entity';
import { MediaTargetType } from '../enum/media-target-type.enum';

@Injectable()
export class ContentService {
  private readonly logger = new Logger(ContentService.name);
  private readonly maxMediaFileSizeInBytes = 500 * 1024 * 1024;
  constructor(
    private readonly contentRepo: ContentRepository,
    private readonly jwtService: JwtService,
    private readonly httpsService: HttpsService,
    @InjectQueue(NameNotificationQueue)
    private readonly notificationQueue: Queue,
    private readonly configService: ConfigService,
    private readonly storageService: StorageService,
  ) {}
  private async decodeTimelineCursor(
    cursor: string,
  ): Promise<TimelineCursor | undefined> {
    if (!cursor) return undefined;
    try {
      return await this.jwtService.verifyAsync<TimelineCursor>(cursor);
    } catch {
      throw new BadRequestException(
        message.content.get_timeline_content.cursor_invalid,
      );
    }
  }
  async getSelfTimelineContents(currentUserId: number, cursor?: string) {
    let cursorDecoded: TimelineCursor | undefined;
    let pinnedContents: PinnedContent[] | undefined;
    if (cursor) {
      cursorDecoded = await this.decodeTimelineCursor(cursor);
    } else {
      cursorDecoded = undefined;
      pinnedContents = await this.contentRepo.getPinnedContents(
        currentUserId,
        currentUserId,
      );
    }
    const timelineItems = await this.contentRepo.getTimelineContents(
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
      timelineId: finalTimelineItem.timelineItemId,
      timelineCreatedAt: finalTimelineItem.timelineCreatedAt,
      timelineType: finalTimelineItem.timelineItemType,
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
        message.content.get_timeline_content.user_not_found,
      );
    }
    //check if get self timeline
    if (currentUserId === timelineOwnerUser.id) {
      return await this.getSelfTimelineContents(currentUserId, cursor);
    }
    //check if current user got blocked by timeline owner user
    const isBlockedByTarget = await this.contentRepo.checkBlocked(
      currentUserId,
      timelineOwnerUser.id,
    );
    if (isBlockedByTarget) {
      throw new NotFoundException(
        message.content.get_timeline_content.user_not_found,
      );
    }
    //check if current user blocked timeline owner
    const isTargetBlocked = await this.contentRepo.checkBlocked(
      timelineOwnerUser.id,
      currentUserId,
    );
    if (isTargetBlocked) {
      throw new NotFoundException(
        message.content.get_timeline_content.target_user_block,
      );
    }
    let cursorDecoded: TimelineCursor | undefined;
    let pinnedContents: PinnedContent[] | undefined;
    if (cursor) {
      cursorDecoded = await this.decodeTimelineCursor(cursor);
    } else {
      cursorDecoded = undefined;
      pinnedContents = await this.contentRepo.getPinnedContents(
        timelineOwnerUser.id,
        currentUserId,
      );
    }
    const timelineItems = await this.contentRepo.getTimelineContents(
      timelineOwnerUser.id,
      currentUserId,
      cursorDecoded,
    );
    //check if there is any item
    const finalTimlineItem = timelineItems[timelineItems.length - 1];
    if (!finalTimlineItem) {
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
      timelineId: finalTimlineItem.timelineItemId,
      timelineCreatedAt: finalTimlineItem.timelineCreatedAt,
      timelineType: finalTimlineItem.timelineItemType,
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
  async getSavedContents(currentUserId: number, cursor?: string) {
    //check if has cursor
    let cursorDecoded: Cursor | undefined;
    if (cursor) {
      try {
        cursorDecoded = await this.jwtService.verifyAsync<Cursor>(cursor);
      } catch {
        throw new BadRequestException(
          message.content.get_saved_content.cursor_invalid,
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
  async createPost(currentUserId: number, createPostDTO: CreatePostDTO) {
    const {
      text,
      mentionedUsers,
      isHadMediaFiles,
      mediaFilesNumber,
      mediaContentTypes,
    } = createPostDTO;
    const normalizedText = text?.trim() ?? '';
    const hasText = normalizedText.length > 0;
    const hasMedia = isHadMediaFiles === true;
    // business rule: post must have text or media
    if (!hasText && !hasMedia) {
      throw new BadRequestException(
        message.content.create_post.text_or_media_required,
      );
    }
    if (hasMedia) {
      if (!Number.isInteger(mediaFilesNumber) || mediaFilesNumber <= 0) {
        throw new BadRequestException(
          message.content.create_post.media_files_number_invalid,
        );
      }
      if (!Array.isArray(mediaContentTypes) || mediaContentTypes.length === 0) {
        throw new BadRequestException(
          message.content.create_post.media_content_types_required,
        );
      }
      if (mediaContentTypes.length !== mediaFilesNumber) {
        throw new BadRequestException(
          message.content.create_post.media_content_types_count_mismatch,
        );
      }
    }
    //check toxic only when text exists
    if (hasText) {
      await this.httpsService.checkToxic(normalizedText);
    }
    //valid mentioned user to make sure mentioned users are created post user's friends
    const friends = await this.contentRepo.findFriends(currentUserId);
    const mentionedUsernameSet = new Set(mentionedUsers ?? []);
    const validMentionedUsers = friends.filter((friend) => {
      if (mentionedUsernameSet.has(friend.username)) return friend;
    });
    //find author
    const author = await this.contentRepo.findUserById(currentUserId);
    if (!author) {
      throw new NotFoundException(
        sendResponse(
          HttpStatus.NOT_FOUND,
          message.content.create_post.user_not_found,
        ),
      );
    }
    //store post
    const insertingPost: Partial<ContentEntity> = {
      text: hasText ? normalizedText : undefined,
      type: ContentType.POST,
      mentionedUser: validMentionedUsers,
      author: author,
    };
    const insertedPost = await this.contentRepo.insertContent(insertingPost);
    const createdPost = {
      ...insertedPost,
      author: {
        username: author.username,
        displayName: author.displayName,
        avatarUrl: ConvertMediaRelativePathToUrl(
          this.configService,
          author.avatarRelativePath,
        ),
      },
    };
    //gen and send presigned urls if there are attached media files
    if (hasMedia) {
      try {
        const { presignedMediaUrls, mediaKeys } =
          await this.storageService.genMediaPresignedUrls(
            mediaContentTypes!,
            insertedPost.id,
          );
        this.notificationQueue
          .add(
            JobNotificationQueue.CONTENT_CREATION,
            {
              createdContent: insertedPost,
              currentUser: author,
            },
            { priority: 3 },
          )
          .catch((error) => {
            this.logger.error(
              `Failed to enqueue content creation notification for content ${insertedPost.id}`,
              error instanceof Error ? error.stack : String(error),
            );
          });
        return sendResponse(
          HttpStatus.CREATED,
          message.content.create_post.success,
          {
            createdPost: createdPost,
            presignedMediaUrls: presignedMediaUrls,
            mediaKeys: mediaKeys,
          },
        );
      } catch (error) {
        await this.contentRepo.deleteContentById(insertedPost.id);
        if (error instanceof BadRequestException) {
          throw error;
        }
        this.logger.error(
          `Failed to generate media presigned urls for content ${insertedPost.id}. Rolled back content.`,
          error instanceof Error ? error.stack : String(error),
        );
        throw new InternalServerErrorException(
          message.content.create_post.gen_media_presigned_url_failed,
        );
      }
    }
    this.notificationQueue
      .add(
        JobNotificationQueue.CONTENT_CREATION,
        {
          createdContent: insertedPost,
          currentUser: author,
        },
        { priority: 3 },
      )
      .catch((error) => {
        this.logger.error(
          `Failed to enqueue content creation notification for content ${insertedPost.id}`,
          error instanceof Error ? error.stack : String(error),
        );
      });
    return sendResponse(
      HttpStatus.CREATED,
      message.content.create_post.success,
      {
        createdPost: createdPost,
      },
    );
  }
  async confirmedUploadContentMediaFiles(
    currentUserId: number,
    confirmUploadContentMediaDTO: ConfirmUploadContentMediaDTO,
  ) {
    const { mediaKeys } = confirmUploadContentMediaDTO;
    // Request payload is validated by ConfirmUploadContentMediaDTO.
    // Parse each key and validate key pattern:
    // temp/media/content/{contentId}/{contentId}-{sortOrder}
    const parsedMediaKeys = mediaKeys.map((mediaKey) => {
      const match = mediaKey.match(/temp\/media\/content\/(\d+)\/(\d+)-(\d+)$/);
      if (!match) {
        throw new BadRequestException(
          message.content.create_post.invalid_media_key,
        );
      }
      const contentId = Number(match[1]);
      const contentIdFromFileName = Number(match[2]);
      const sortOrder = Number(match[3]);
      if (contentId !== contentIdFromFileName || sortOrder <= 0) {
        throw new BadRequestException(
          message.content.create_post.invalid_media_key,
        );
      }
      return { mediaKey, contentId, sortOrder };
    });
    // Ensure all keys belong to the same content.
    const contentId = parsedMediaKeys[0].contentId;
    const isSameContent = parsedMediaKeys.every(
      (parsedMediaKey) => parsedMediaKey.contentId === contentId,
    );
    if (!isSameContent) {
      throw new BadRequestException(
        message.content.create_post.invalid_media_key,
      );
    }
    // Ensure target content exists before persisting media rows.
    const content = await this.contentRepo.findContentWithAuthorById(contentId);
    if (!content) {
      throw new NotFoundException(
        message.content.create_post.confirm_content_not_found,
      );
    }
    if (content.author.id !== currentUserId) {
      throw new NotFoundException(
        message.content.create_post.confirm_content_not_found,
      );
    }
    // Verify each object exists on storage and has valid MIME type.
    const mediaMetas = await Promise.all(
      parsedMediaKeys.map(async ({ mediaKey, sortOrder }) => {
        const [mediaObjectSize, mediaObjectContentType, mediaObjectHeadBytes] =
          await Promise.all([
            this.storageService.getObjectSize(mediaKey),
            this.storageService.getObjectContentType(mediaKey),
            this.storageService.getObjectHeadBytes(mediaKey, 4096),
          ]);
        if (
          !mediaObjectSize ||
          !mediaObjectContentType ||
          !mediaObjectHeadBytes
        ) {
          throw new NotFoundException(
            sendResponse(
              HttpStatus.NOT_FOUND,
              message.storage.object_not_found,
            ),
          );
        }
        if (mediaObjectSize > this.maxMediaFileSizeInBytes) {
          await this.storageService.deleteObject(mediaKey);
          throw new BadRequestException(
            message.content.create_post.media_file_too_large,
          );
        }
        const normalizedContentType = this.storageService.normalizeMimeType(
          mediaObjectContentType,
        );
        const detectedMimeType =
          this.storageService.detectMimeTypeFromMagicBytes(
            mediaObjectHeadBytes,
          );
        const isValidDetectedMimeType =
          detectedMimeType &&
          this.storageService.isAllowedMediaContentType(detectedMimeType);
        const isMimeTypeMismatch =
          !detectedMimeType ||
          !this.storageService.isMimeTypeCompatible(
            normalizedContentType,
            detectedMimeType,
          );
        if (!isValidDetectedMimeType || isMimeTypeMismatch) {
          await this.storageService.deleteObject(mediaKey);
          throw new BadRequestException(
            message.content.create_post.invalid_media_content_type,
          );
        }
        const mediaType =
          this.storageService.getMediaTypeFromMimeType(detectedMimeType);
        return {
          mediaKey,
          sortOrder,
          mediaType,
        };
      }),
    );
    // Move objects from temp path to permanent path.
    await Promise.all(
      mediaMetas.map(async ({ mediaKey }) => {
        await this.storageService.moveObject(mediaKey, mediaKey.slice(5));
      }),
    );
    // Build entities and persist media metadata to database.
    const mediaFileEntities: MediaFileEntity[] = mediaMetas.map(
      ({ mediaKey, sortOrder, mediaType }) =>
        ({
          targetType: MediaTargetType.CONTENT,
          targetId: contentId,
          relativePath: mediaKey.slice(5),
          sortOrder,
          type: mediaType,
        }) as MediaFileEntity,
    );
    let insertedMediaFiles: MediaFileEntity[];
    try {
      insertedMediaFiles =
        await this.contentRepo.insertMedias(mediaFileEntities);
    } catch (error) {
      await Promise.all(
        mediaMetas.map(async ({ mediaKey }) => {
          const destinationKey = mediaKey.slice(5);
          await this.storageService.moveObject(destinationKey, mediaKey);
        }),
      );
      this.logger.error(
        `Failed to store media metadata for content ${contentId}. Rolled back media objects to temp.`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException(
        message.content.create_post.confirm_media_failed,
      );
    }
    // Return content with normalized media URLs after confirm upload.
    return sendResponse(
      HttpStatus.OK,
      message.content.create_post.confirm_media_success,
      {
        content: {
          id: content.id,
          text: content.text,
          type: content.type,
          isPinned: content.isPinned,
          createdAt: content.createdAt,
          updatedAt: content.updatedAt,
          author: {
            username: content.author.username,
            displayName: content.author.displayName,
            avatarUrl: ConvertMediaRelativePathToUrl(
              this.configService,
              content.author.avatarRelativePath,
            ),
          },
          mediaFiles: insertedMediaFiles.map((insertedMediaFile) => ({
            id: insertedMediaFile.id,
            type: insertedMediaFile.type,
            sortOrder: insertedMediaFile.sortOrder,
            url: ConvertMediaRelativePathToUrl(
              this.configService,
              insertedMediaFile.relativePath,
            ),
          })),
        },
      },
    );
  }
}
