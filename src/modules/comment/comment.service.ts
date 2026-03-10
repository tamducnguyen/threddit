import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { InjectQueue } from '@nestjs/bullmq';
import { JwtService } from '@nestjs/jwt';
import {
  BadRequestException,
  HttpStatus,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { Cache } from 'cache-manager';
import { Queue } from 'bullmq';
import { errorCode } from '../common/helper/errorcode.helper';
import { message } from '../common/helper/message.helper';
import { sendResponse } from '../common/helper/response.helper';
import { MediaTargetType } from '../enum/media-target-type.enum';
import { CommentEntity } from '../entities/comment.entity';
import { MediaFileEntity } from '../entities/media-file.entity';
import { UserEntity } from '../entities/user.entity';
import { HttpsService } from '../http/http.service';
import {
  JobNotificationQueue,
  NameNotificationQueue,
} from '../notification/helper/notification.helper';
import { StorageService } from '../storage/storage.service';
import { CommentRepository } from './comment.repository';
import { CommentContentDTO } from './dtos/comment-content.dto';
import { Cursor } from '../interface/cursor.interface';
import { UpdateCommentDTO } from './dtos/update-comment.dto';

@Injectable()
export class CommentService {
  private readonly logger = new Logger(CommentService.name);

  constructor(
    private readonly commentRepo: CommentRepository,
    private readonly httpsService: HttpsService,
    private readonly storageService: StorageService,
    private readonly jwtService: JwtService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    @InjectQueue(NameNotificationQueue)
    private readonly notificationQueue: Queue,
  ) {}

  /**
   * Validates whether the current user is allowed to comment on the target
   * author's post based on the block relationship between the two users.
   *
   * Rules:
   * - if the author blocked the current user, hide the post via `NotFound`
   * - if the current user blocked the author, reject via `BadRequest`
   *
   * @param currentUserId Current authenticated user id.
   * @param targetUserId Target post author id.
   * @param notFoundMessage Message used when the target user blocked current user.
   * @param notFoundErrorCode Error code used when the target user blocked current user.
   * @param targetBlockedMessage Message used when current user blocked the target user.
   * @param targetBlockedErrorCode Error code used when current user blocked the target user.
   */
  private async validateCommentAccess(
    currentUserId: number,
    targetUserId: number,
    notFoundMessage: string,
    notFoundErrorCode: string,
    targetBlockedMessage: string,
    targetBlockedErrorCode: string,
  ) {
    // Skip block validation when the user comments on their own post.
    if (currentUserId === targetUserId) {
      return;
    }

    // Check both block directions in parallel to reduce database latency.
    const [isBlockedByTarget, isTargetBlocked] = await Promise.all([
      this.commentRepo.checkBlocked(currentUserId, targetUserId),
      this.commentRepo.checkBlocked(targetUserId, currentUserId),
    ]);

    // Hide the post when the author has blocked the current user.
    if (isBlockedByTarget) {
      throw new NotFoundException(
        sendResponse(
          HttpStatus.NOT_FOUND,
          notFoundMessage,
          undefined,
          notFoundErrorCode,
        ),
      );
    }

    // Reject the request when the current user already blocked the author.
    if (isTargetBlocked) {
      throw new BadRequestException(
        sendResponse(
          HttpStatus.BAD_REQUEST,
          targetBlockedMessage,
          undefined,
          targetBlockedErrorCode,
        ),
      );
    }
  }

  /**
   * Rolls back media objects that were already moved to permanent storage keys
   * when a later step fails.
   *
   * @param movedMediaPairs Successfully moved temp-to-permanent key pairs.
   */
  private async rollbackMovedMediaFiles(
    movedMediaPairs: Array<{ tempKey: string; destinationKey: string }>,
  ) {
    // Nothing to rollback when no file has been moved successfully.
    if (movedMediaPairs.length === 0) return;

    // Move files back to their temp keys in best-effort mode.
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
   * Validates uploaded media objects, moves them to permanent storage, and
   * builds the media entities that can be persisted for a comment.
   *
   * @param currentUserId Media owner id.
   * @param commentId Target comment id.
   * @param mediaKeys Temp media keys resolved from the upload session.
   * @returns Persistable media entities and the successfully moved key pairs.
   */
  private async moveUploadedMediaToCommentStorage(
    currentUserId: number,
    commentId: number,
    mediaKeys: string[],
  ) {
    // Skip media preparation when the request has no media.
    if (mediaKeys.length === 0) {
      return {
        mediaFileEntities: [] as MediaFileEntity[],
        movedMediaPairs: [] as Array<{
          tempKey: string;
          destinationKey: string;
        }>,
      };
    }

    // Validate existence, size, and detected MIME type of uploaded objects.
    const mediaMetas =
      await this.storageService.validateUploadedMediaObjects(mediaKeys);

    // Prepare permanent keys and final sort order before moving files.
    const mediaPayloads = mediaMetas.map(({ mediaKey, mediaType }, index) => ({
      mediaKey,
      mediaType,
      sortOrder: index + 1,
      destinationKey: this.storageService.getPermanentMediaKey(
        currentUserId,
        commentId,
      ),
    }));

    // Move all files to permanent storage and keep track of successful moves.
    const moveResults = await Promise.allSettled(
      mediaPayloads.map(async ({ mediaKey, destinationKey }) => {
        await this.storageService.moveObject(mediaKey, destinationKey);
        return { tempKey: mediaKey, destinationKey };
      }),
    );

    const movedMediaPairs = moveResults
      .filter(
        (
          moveResult,
        ): moveResult is PromiseFulfilledResult<{
          tempKey: string;
          destinationKey: string;
        }> => moveResult.status === 'fulfilled',
      )
      .map((moveResult) => moveResult.value);

    // Roll back already moved files if at least one move fails.
    const rejectedMove = moveResults.find(
      (moveResult): moveResult is PromiseRejectedResult =>
        moveResult.status === 'rejected',
    );
    if (rejectedMove) {
      await this.rollbackMovedMediaFiles(movedMediaPairs);
      throw rejectedMove.reason;
    }

    // Build media entities so the caller can persist them transactionally.
    const mediaFileEntities = mediaPayloads.map(
      ({ destinationKey, mediaType, sortOrder }) =>
        ({
          targetType: MediaTargetType.COMMENT,
          targetId: commentId,
          type: mediaType,
          relativePath: destinationKey,
          sortOrder,
        }) as MediaFileEntity,
    );

    return { mediaFileEntities, movedMediaPairs };
  }

  /**
   * Attaches uploaded media from an upload session to a newly created comment.
   *
   * Flow:
   * - validate uploaded media objects in storage
   * - move media from temp keys to permanent keys
   * - rollback moved files if any move fails
   * - persist media metadata into `media_files`
   *
   * @param currentUserId Media owner id.
   * @param commentId Newly created comment id.
   * @param mediaKeys Temp media keys resolved from the upload session.
   * @returns Persisted media file entities for the comment.
   */
  private async attachUploadedMediaToComment(
    currentUserId: number,
    commentId: number,
    mediaKeys: string[],
  ) {
    // Move uploaded files first so the database only ever stores permanent keys.
    const { mediaFileEntities, movedMediaPairs } =
      await this.moveUploadedMediaToCommentStorage(
        currentUserId,
        commentId,
        mediaKeys,
      );

    // Skip persistence when the request has no media.
    if (mediaFileEntities.length === 0) return [];

    try {
      // Persist the final media rows after storage moves have succeeded.
      return await this.commentRepo.insertMedias(mediaFileEntities);
    } catch (error) {
      // Restore moved storage objects when database persistence fails.
      await this.rollbackMovedMediaFiles(movedMediaPairs);
      throw error;
    }
  }

  /**
   * Enqueues mention notifications for users mentioned in a comment.
   *
   * @param comment Comment payload used by the notification worker.
   * @param validMentionedUsers Mentioned users resolved from usernames.
   */
  private enqueueMentionInCommentNotification(
    comment: CommentEntity,
    validMentionedUsers: UserEntity[],
  ) {
    // Skip queue work when the comment does not mention any valid user.
    if (validMentionedUsers.length === 0) return;

    // Enqueue mention notifications in best-effort mode.
    this.notificationQueue
      .add(
        JobNotificationQueue.MENTION_IN_COMMENT,
        {
          comment,
          mentionedFriends: validMentionedUsers,
        },
        { priority: 2 },
      )
      .catch((error) => {
        this.logger.error(
          `Failed to enqueue mention notification for comment ${comment.id}`,
          error instanceof Error ? error.stack : String(error),
        );
      });
  }

  /**
   * Enqueues the notification sent to the post author after a new comment is
   * created by another user.
   *
   * @param comment Comment payload used by the notification worker.
   */
  private enqueueCommentNotification(comment: CommentEntity) {
    // Enqueue the author notification in best-effort mode.
    this.notificationQueue
      .add(
        JobNotificationQueue.COMMENT,
        {
          comment,
        },
        { priority: 2 },
      )
      .catch((error) => {
        this.logger.error(
          `Failed to enqueue comment notification for content ${comment.content.id}`,
          error instanceof Error ? error.stack : undefined,
        );
      });
  }

  /**
   * Enqueues the notification sent to the parent comment owner after someone
   * replies to their comment.
   *
   * @param comment Reply comment payload used by the notification worker.
   * @param parentCommenter Owner of the parent comment.
   */
  private enqueueReplyCommentNotification(
    comment: CommentEntity,
    parentCommenter: UserEntity,
  ) {
    // Enqueue the reply notification in best-effort mode.
    this.notificationQueue
      .add(
        JobNotificationQueue.REPLY_COMMENT,
        {
          comment,
          parentCommenter,
        },
        { priority: 2 },
      )
      .catch((error) => {
        this.logger.error(
          `Failed to enqueue reply notification for comment ${comment.id}`,
          error instanceof Error ? error.stack : undefined,
        );
      });
  }

  /**
   * Decodes the optional paging cursor used by comment list endpoints.
   *
   * @param cursor Signed JWT cursor from the previous page.
   * @returns Decoded cursor payload or `undefined` when no cursor is provided.
   */
  private async decodeCommentCursor(cursor?: string) {
    if (!cursor) return undefined;

    try {
      return await this.jwtService.verifyAsync<Cursor>(cursor);
    } catch {
      throw new BadRequestException(
        sendResponse(
          HttpStatus.BAD_REQUEST,
          message.content.get_comment.cursor_invalid,
          undefined,
          errorCode.content.get_comment.cursor_invalid,
        ),
      );
    }
  }

  /**
   * Validates that every commenter present in a prefetched comment chain is
   * visible to the current user.
   *
   * @param currentUserId Current authenticated user id.
   * @param commenterIds Commenter ids collected from the loaded comment chain.
   * @param notFoundMessage Message used when a commenter blocked current user.
   * @param notFoundErrorCode Error code used when a commenter blocked current user.
   * @param targetBlockedMessage Message used when current user blocked a commenter.
   * @param targetBlockedErrorCode Error code used when current user blocked a commenter.
   */
  private async validateCommentChainVisibility(
    currentUserId: number,
    commenterIds: number[],
    notFoundMessage: string,
    notFoundErrorCode: string,
    targetBlockedMessage: string,
    targetBlockedErrorCode: string,
  ) {
    const [isBlockedByAnyCommenter, isAnyCommenterBlocked] = await Promise.all([
      this.commentRepo.isBlockedByAnyTarget(currentUserId, commenterIds),
      this.commentRepo.isAnyTargetBlockedByCurrentUser(
        currentUserId,
        commenterIds,
      ),
    ]);

    if (isBlockedByAnyCommenter) {
      throw new NotFoundException(
        sendResponse(
          HttpStatus.NOT_FOUND,
          notFoundMessage,
          undefined,
          notFoundErrorCode,
        ),
      );
    }

    if (isAnyCommenterBlocked) {
      throw new BadRequestException(
        sendResponse(
          HttpStatus.BAD_REQUEST,
          targetBlockedMessage,
          undefined,
          targetBlockedErrorCode,
        ),
      );
    }
  }

  /**
   * Creates a new comment on a post.
   *
   * Business rules:
   * - the target content must exist and be a post
   * - if `parentCommentId` is provided, the parent comment must exist in the same post
   * - if `parentCommentId` is provided, the reply must also respect block rules with the parent commenter
   * - the current user must exist
   * - the request must contain text or media
   * - only one media file is allowed
   * - the block relationship between commenter and author must be respected
   *
   * @param currentUserId Current authenticated user id.
   * @param contentId Target post id.
   * @param commentContentDTO Incoming comment payload.
   * @returns Standard success response after the comment is created.
   */
  async commentContent(
    currentUserId: number,
    contentId: number,
    commentContentDTO: CommentContentDTO,
  ) {
    // Load current user, target post, and optional parent comment in parallel.
    const [currentUserFound, contentFound, parentCommentFound] =
      await Promise.all([
        this.commentRepo.findUserById(currentUserId),
        this.commentRepo.findContentWithAuthorById(contentId),
        commentContentDTO.parentCommentId
          ? this.commentRepo.findCommentByIdAndContentId(
              commentContentDTO.parentCommentId,
              contentId,
            )
          : Promise.resolve(null),
      ]);

    // Stop early when the current user cannot be found.
    if (!currentUserFound) {
      throw new NotFoundException(
        sendResponse(
          HttpStatus.NOT_FOUND,
          message.content.comment.user_not_found,
          undefined,
          errorCode.content.comment.user_not_found,
        ),
      );
    }

    // Only allow commenting on an existing post.
    if (!contentFound) {
      throw new NotFoundException(
        sendResponse(
          HttpStatus.NOT_FOUND,
          message.content.comment.content_not_found,
          undefined,
          errorCode.content.comment.content_not_found,
        ),
      );
    }

    // Reject reply creation when the parent comment does not belong to this post.
    if (commentContentDTO.parentCommentId && !parentCommentFound) {
      throw new NotFoundException(
        sendResponse(
          HttpStatus.NOT_FOUND,
          message.content.comment.parent_comment_not_found,
          undefined,
          errorCode.content.comment.parent_comment_not_found,
        ),
      );
    }

    // Enforce access rules derived from the block relationship.
    await this.validateCommentAccess(
      currentUserId,
      contentFound.author.id,
      message.content.comment.content_not_found,
      errorCode.content.comment.content_not_found,
      message.content.comment.target_user_block,
      errorCode.content.comment.target_user_block,
    );

    // Apply the same block validation against the parent comment owner for replies.
    if (parentCommentFound?.commenter) {
      await this.validateCommentAccess(
        currentUserId,
        parentCommentFound.commenter.id,
        message.content.comment.parent_comment_not_found,
        errorCode.content.comment.parent_comment_not_found,
        message.content.comment.parent_commenter_block,
        errorCode.content.comment.parent_commenter_block,
      );
    }

    // Normalize text input and resolve media keys from the upload session.
    const normalizedText = commentContentDTO.text?.trim() ?? '';
    const hasText = normalizedText.length > 0;
    const mentionedUsernameSet = new Set(
      commentContentDTO.mentionedUsers ?? [],
    );
    const mediaKeys =
      await this.storageService.validateAndResolveMediaKeysFromUploadSession(
        currentUserId,
        commentContentDTO.uploadSessionId,
      );
    const hasMedia = mediaKeys.length > 0;

    // Resolve valid mentioned users from incoming usernames and exclude self.
    const validMentionedUsers =
      mentionedUsernameSet.size === 0
        ? []
        : (await this.commentRepo.findFriends(currentUserId)).filter((friend) =>
            mentionedUsernameSet.has(friend.username),
          );
    // Comments currently support at most one attached media file.
    if (mediaKeys.length > 1) {
      throw new BadRequestException(
        sendResponse(
          HttpStatus.BAD_REQUEST,
          message.content.comment.only_one_media_allowed,
          undefined,
          errorCode.content.comment.only_one_media_allowed,
        ),
      );
    }

    // Reject empty comments when both text and media are missing.
    if (!hasText && !hasMedia) {
      throw new BadRequestException(
        sendResponse(
          HttpStatus.BAD_REQUEST,
          message.content.comment.text_or_media_required,
          undefined,
          errorCode.content.comment.text_or_media_required,
        ),
      );
    }

    // Only run toxicity validation when text is actually present.
    if (hasText) {
      await this.httpsService.checkToxic(normalizedText);
    }

    // Create the comment first so its id can be used for permanent media keys.
    const insertedComment = await this.commentRepo.insertComment(
      contentFound,
      currentUserFound,
      hasText ? normalizedText : null,
      validMentionedUsers,
      parentCommentFound !== null ? parentCommentFound : undefined,
    );

    try {
      // Attach uploaded media; failures here must roll back the new comment.
      await this.attachUploadedMediaToComment(
        currentUserId,
        insertedComment.id,
        mediaKeys,
      );
    } catch (error) {
      // Remove the newly inserted comment to avoid partial persistence.
      await this.commentRepo.deleteCommentById(insertedComment.id);

      // Preserve already classified business exceptions.
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      this.logger.error(
        `Failed to attach media for comment ${insertedComment.id}.`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException(
        sendResponse(
          HttpStatus.INTERNAL_SERVER_ERROR,
          message.content.comment.confirm_media_failed,
          undefined,
          errorCode.content.comment.confirm_media_failed,
        ),
      );
    }

    // Clear the upload session after media has been attached successfully.
    if (commentContentDTO.uploadSessionId) {
      await this.cacheManager.del(commentContentDTO.uploadSessionId);
    }

    // Build the shared notification payload once after the comment is fully persisted.
    const commentForNotification = {
      ...insertedComment,
      content: contentFound,
      commenter: currentUserFound,
    } as CommentEntity;

    // Notify the post author only when someone else comments on the post and
    // that author is not already being notified as the parent comment owner.
    if (
      contentFound.author.id !== currentUserId &&
      contentFound.author.id !== parentCommentFound?.commenter?.id
    ) {
      this.enqueueCommentNotification(commentForNotification);
    }

    // Notify the parent comment owner when this comment is a reply.
    if (parentCommentFound?.commenter.id !== undefined) {
      const parentCommenter = parentCommentFound.commenter;
      if (parentCommenter.id !== currentUserId) {
        this.enqueueReplyCommentNotification(
          commentForNotification,
          parentCommenter,
        );
      }
    }

    // Notify mentioned users for both self-comments and comments on others' posts.
    this.enqueueMentionInCommentNotification(
      commentForNotification,
      validMentionedUsers,
    );
    //Get created comment
    const createdComment = await this.commentRepo.getCommentById(
      insertedComment.id,
      currentUserFound.id,
    );
    // Return the standardized success response after the full flow completes.
    return sendResponse(HttpStatus.OK, message.content.comment.success, {
      createdComment,
    });
  }

  /**
   * Updates an owned comment.
   *
   * Business rules:
   * - the target comment must belong to the current user
   * - the block relationship with the post author must still allow access
   * - reply comments must also respect block rules with the parent commenter
   * - the final comment must contain text or one media file
   * - `removeMedia` deletes current media, while `uploadSessionId` replaces it
   * - mention notifications are sent only to newly mentioned users
   *
   * @param currentUserId Current authenticated user id.
   * @param commentId Target comment id.
   * @param updateCommentDTO Incoming update payload.
   * @returns Standard success response after the comment is updated.
   */
  async updateComment(
    currentUserId: number,
    commentId: number,
    updateCommentDTO: UpdateCommentDTO,
  ) {
    // Require at least one mutable field so empty payloads fail fast.
    const hasAnyFieldToUpdate =
      updateCommentDTO.text !== undefined ||
      updateCommentDTO.uploadSessionId !== undefined ||
      updateCommentDTO.removeMedia === true ||
      updateCommentDTO.mentionedUsers !== undefined;
    if (!hasAnyFieldToUpdate) {
      throw new BadRequestException(
        sendResponse(
          HttpStatus.BAD_REQUEST,
          message.content.update_comment.no_field_to_update,
          undefined,
          errorCode.content.update_comment.no_field_to_update,
        ),
      );
    }
    //Avoid action conflict
    const wantsToReplaceMedia = Boolean(updateCommentDTO.uploadSessionId);
    const wantsToRemoveMedia = updateCommentDTO.removeMedia === true;
    if (wantsToRemoveMedia && wantsToReplaceMedia) {
      throw new BadRequestException(
        sendResponse(
          HttpStatus.BAD_REQUEST,
          message.content.update_comment.media_action_conflict,
        ),
      );
    }

    // Load the owned comment with all relations needed for validation and diffing.
    const ownedComment =
      await this.commentRepo.findOwnedCommentWithRelationsById(
        commentId,
        currentUserId,
      );
    if (!ownedComment) {
      throw new NotFoundException(
        sendResponse(
          HttpStatus.NOT_FOUND,
          message.content.update_comment.not_found,
          undefined,
          errorCode.content.update_comment.not_found,
        ),
      );
    }

    // Re-apply post-author visibility rules before allowing the edit.
    await this.validateCommentAccess(
      currentUserId,
      ownedComment.content.author.id,
      message.content.update_comment.not_found,
      errorCode.content.update_comment.not_found,
      message.content.update_comment.target_user_block,
      errorCode.content.update_comment.target_user_block,
    );

    // Re-apply parent-commenter visibility rules when the comment is a reply.
    if (ownedComment.parentComment?.commenter) {
      await this.validateCommentAccess(
        currentUserId,
        ownedComment.parentComment.commenter.id,
        message.content.update_comment.not_found,
        errorCode.content.update_comment.not_found,
        message.content.update_comment.parent_commenter_block,
        errorCode.content.update_comment.parent_commenter_block,
      );
    }

    // Normalize text so empty strings can intentionally clear the existing text.
    const normalizedText =
      updateCommentDTO.text !== undefined
        ? updateCommentDTO.text.trim()
        : (ownedComment.text?.trim() ?? '');
    const finalText = normalizedText.length > 0 ? normalizedText : null;

    // Resolve the new upload session only when client wants to replace comment media.
    const existingMediaFiles =
      await this.commentRepo.getMediaFileByCommentId(commentId);
    const uploadedMediaKeys = wantsToReplaceMedia
      ? await this.storageService.validateAndResolveMediaKeysFromUploadSession(
          currentUserId,
          updateCommentDTO.uploadSessionId,
        )
      : [];

    // Comments still support at most one media after the update.
    if (uploadedMediaKeys.length > 1) {
      throw new BadRequestException(
        sendResponse(
          HttpStatus.BAD_REQUEST,
          message.content.update_comment.only_one_media_allowed,
          undefined,
          errorCode.content.update_comment.only_one_media_allowed,
        ),
      );
    }

    // Preserve current media unless the request explicitly removes or replaces it.
    const hasFinalMedia = wantsToReplaceMedia
      ? uploadedMediaKeys.length > 0
      : wantsToRemoveMedia
        ? false
        : existingMediaFiles.length > 0;

    // Reject updates that would leave the comment empty.
    if (!finalText && !hasFinalMedia) {
      throw new BadRequestException(
        sendResponse(
          HttpStatus.BAD_REQUEST,
          message.content.update_comment.text_or_media_required,
          undefined,
          errorCode.content.update_comment.text_or_media_required,
        ),
      );
    }

    // Only scan text for toxicity when client actually sends non-empty text.
    if (updateCommentDTO.text !== undefined && finalText) {
      await this.httpsService.checkToxic(finalText);
    }

    // Resolve mentions only when the client explicitly updates the mention list.
    let finalMentionedUsers = ownedComment.mentionedUsers;
    let newlyMentionedUsers: UserEntity[] = [];
    if (updateCommentDTO.mentionedUsers !== undefined) {
      const mentionedUsernameSet = new Set(updateCommentDTO.mentionedUsers);
      finalMentionedUsers =
        mentionedUsernameSet.size === 0
          ? []
          : (await this.commentRepo.findFriends(currentUserId)).filter(
              (friend) => mentionedUsernameSet.has(friend.username),
            );

      const existingMentionedUserIdSet = new Set(
        ownedComment.mentionedUsers.map((mentionedUser) => mentionedUser.id),
      );
      newlyMentionedUsers = finalMentionedUsers.filter(
        (mentionedUser) => !existingMentionedUserIdSet.has(mentionedUser.id),
      );
    }

    // Move uploaded media to permanent storage before the transactional DB update.
    let newMediaFileEntities: MediaFileEntity[] | undefined;
    let movedMediaPairs: Array<{ tempKey: string; destinationKey: string }> =
      [];
    if (wantsToReplaceMedia) {
      const movedMedia = await this.moveUploadedMediaToCommentStorage(
        currentUserId,
        commentId,
        uploadedMediaKeys,
      );
      newMediaFileEntities = movedMedia.mediaFileEntities;
      movedMediaPairs = movedMedia.movedMediaPairs;
    }

    try {
      // Persist all requested changes atomically to avoid partial writes.
      await this.commentRepo.updateCommentById(commentId, {
        text: updateCommentDTO.text !== undefined ? finalText : undefined,
        mentionedUserIds:
          updateCommentDTO.mentionedUsers !== undefined
            ? finalMentionedUsers.map((mentionedUser) => mentionedUser.id)
            : undefined,
        previousMentionedUserIds:
          updateCommentDTO.mentionedUsers !== undefined
            ? ownedComment.mentionedUsers.map(
                (mentionedUser) => mentionedUser.id,
              )
            : undefined,
        mediaFiles:
          wantsToReplaceMedia || wantsToRemoveMedia
            ? wantsToReplaceMedia
              ? (newMediaFileEntities ?? [])
              : []
            : undefined,
      });
    } catch (error) {
      // Restore moved files when the database update fails after storage move.
      if (movedMediaPairs.length > 0) {
        await this.rollbackMovedMediaFiles(movedMediaPairs);
      }

      this.logger.error(
        `Failed to update comment ${commentId}.`,
        error instanceof Error ? error.stack : String(error),
      );

      if (wantsToReplaceMedia) {
        throw new InternalServerErrorException(
          sendResponse(
            HttpStatus.INTERNAL_SERVER_ERROR,
            message.content.update_comment.confirm_media_failed,
            undefined,
            errorCode.content.update_comment.confirm_media_failed,
          ),
        );
      }

      throw error;
    }

    // Delete removed or replaced storage objects after the database has switched rows.
    if (wantsToReplaceMedia || wantsToRemoveMedia) {
      await Promise.allSettled(
        existingMediaFiles.map(async (mediaFile) => {
          await this.storageService.deleteObject(mediaFile.relativePath);
        }),
      );
    }

    // Clear the consumed upload session only after the update succeeds.
    if (updateCommentDTO.uploadSessionId) {
      await this.cacheManager.del(updateCommentDTO.uploadSessionId);
    }

    // Notify only the users newly added to the mention list by this update.
    if (newlyMentionedUsers.length > 0) {
      const commentForNotification = {
        ...ownedComment,
        text: finalText,
        mentionedUsers: finalMentionedUsers,
      } as CommentEntity;
      this.enqueueMentionInCommentNotification(
        commentForNotification,
        newlyMentionedUsers,
      );
    }
    //Get created comment
    const updatedComment = await this.commentRepo.getCommentById(
      commentId,
      currentUserId,
    );

    return sendResponse(HttpStatus.OK, message.content.update_comment.success, {
      updatedComment,
    });
  }

  /**
   * Deletes a comment owned by the current user.
   *
   * Flow:
   * - verify the target comment belongs to the current user
   * - collect the full reply tree so related media can be cleaned up as well
   * - delete comment rows and media rows in one database transaction
   * - delete storage objects in best-effort mode
   *
   * @param currentUserId Current authenticated user id.
   * @param commentId Target comment id.
   * @returns Standard success response after deletion.
   */
  async deleteComment(currentUserId: number, commentId: number) {
    // Ensure the current user owns the target comment.
    const ownedComment = await this.commentRepo.findOwnedCommentById(
      commentId,
      currentUserId,
    );
    if (!ownedComment) {
      throw new NotFoundException(
        sendResponse(
          HttpStatus.NOT_FOUND,
          message.content.delete_comment.not_found,
          undefined,
          errorCode.content.delete_comment.not_found,
        ),
      );
    }

    // Load the full comment subtree because deleting a parent cascades to replies.
    const commentTreeIds = await this.commentRepo.getCommentTreeIds(commentId);

    // Capture media rows before removing them from the database.
    const mediaFiles =
      await this.commentRepo.getCommentMediaFilesByCommentIds(commentTreeIds);

    // Delete the comment tree and all related media rows in one transaction.
    await this.commentRepo.deleteCommentTreeWithMediaByRootId(commentId);

    // Delete storage objects without failing the API on partial cleanup errors.
    await Promise.allSettled(
      mediaFiles.map(async (mediaFile) => {
        await this.storageService.deleteObject(mediaFile.relativePath);
      }),
    );

    return sendResponse(HttpStatus.OK, message.content.delete_comment.success);
  }

  /**
   * Returns a single comment detail by comment id.
   *
   * @param currentUserId Current authenticated user id.
   * @param commentId Target comment id.
   * @returns Standard response containing the mapped detail comment.
   */
  async getDetailComment(currentUserId: number, commentId: number) {
    // Load the target comment and its parent chain in one database roundtrip.
    const { comment, commenterIds } =
      await this.commentRepo.getDetailCommentRows(commentId, currentUserId);
    if (!comment) {
      throw new NotFoundException(
        sendResponse(
          HttpStatus.NOT_FOUND,
          message.content.get_detail_comment.not_found,
          undefined,
          errorCode.content.get_detail_comment.not_found,
        ),
      );
    }

    // Check block relationships against every commenter present in the returned chain.
    await this.validateCommentChainVisibility(
      currentUserId,
      commenterIds,
      message.content.get_detail_comment.not_found,
      errorCode.content.get_detail_comment.not_found,
      message.content.get_detail_comment.target_user_block,
      errorCode.content.get_detail_comment.target_user_block,
    );

    return sendResponse(
      HttpStatus.OK,
      message.content.get_detail_comment.success,
      {
        comment,
      },
    );
  }

  /**
   * Returns top-level comments of a post.
   *
   * Flow:
   * - verify the target content exists
   * - enforce block rules between current user and the post author
   * - load only top-level comments whose commenters are visible to the current user
   * - map rows into the detail-comment response shape with `parentComment = null`
   *
   * @param currentUserId Current authenticated user id.
   * @param contentId Target content id.
   * @returns Standard response containing visible top-level comments.
   */
  async getComments(currentUserId: number, contentId: number, cursor?: string) {
    // Ensure the target content exists so the response does not silently look empty.
    const contentFound =
      await this.commentRepo.findContentWithAuthorById(contentId);
    if (!contentFound) {
      throw new NotFoundException(
        sendResponse(
          HttpStatus.NOT_FOUND,
          message.content.get_comment.content_not_found,
          undefined,
          errorCode.content.get_comment.content_not_found,
        ),
      );
    }

    // Apply the same author-level block rules before exposing any comment list.
    await this.validateCommentAccess(
      currentUserId,
      contentFound.author.id,
      message.content.get_comment.content_not_found,
      errorCode.content.get_comment.content_not_found,
      message.content.get_comment.target_user_block,
      errorCode.content.get_comment.target_user_block,
    );

    // Decode the paging cursor before querying the next slice.
    const cursorDecoded = await this.decodeCommentCursor(cursor);

    // Load visible top-level comments only; blocked commenters are filtered in SQL.
    const comments = await this.commentRepo.getTopLevelComments(
      contentId,
      currentUserId,
      cursorDecoded?.id,
    );

    // Return the empty-state response when the post has no visible top-level comments.
    if (comments.length === 0) {
      return sendResponse(
        HttpStatus.OK,
        message.content.get_comment.no_content,
        {
          comments: [],
          cursor: null,
        },
      );
    }

    // Sign the next cursor from the last item of the current page.
    const finalComment = comments[comments.length - 1];
    const cursorPayload: Cursor = { id: finalComment.id };
    const nextCursor = await this.jwtService.signAsync(cursorPayload);

    // Return the mapped top-level comments in the expected response shape.
    return sendResponse(HttpStatus.OK, message.content.get_comment.success, {
      comments,
      cursor: nextCursor,
    });
  }

  /**
   * Returns direct child comments of a parent comment.
   *
   * Flow:
   * - verify the parent comment exists
   * - enforce block rules against the content author
   * - enforce block rules against the parent commenter
   * - decode cursor and load visible direct replies only
   * - map each reply into the public comment response shape
   *
   * @param currentUserId Current authenticated user id.
   * @param parentCommentId Target parent comment id.
   * @param cursor Signed cursor token from the previous page.
   * @returns Standard response containing direct child comments.
   */
  async getChildComments(
    currentUserId: number,
    parentCommentId: number,
    cursor?: string,
  ) {
    // Ensure the parent comment exists and load enough context for access checks.
    const parentCommentFound =
      await this.commentRepo.findCommentWithContentAuthorAndCommenterById(
        parentCommentId,
      );
    if (!parentCommentFound) {
      throw new NotFoundException(
        sendResponse(
          HttpStatus.NOT_FOUND,
          message.content.get_child_comments.not_found,
          undefined,
          errorCode.content.get_child_comments.not_found,
        ),
      );
    }

    // Respect content-author visibility before exposing any reply list.
    await this.validateCommentAccess(
      currentUserId,
      parentCommentFound.content.author.id,
      message.content.get_detail_comment.not_found,
      errorCode.content.get_detail_comment.not_found,
      message.content.get_detail_comment.target_user_block,
      errorCode.content.get_detail_comment.target_user_block,
    );

    // Respect parent-commenter visibility before exposing any direct reply list.
    await this.validateCommentAccess(
      currentUserId,
      parentCommentFound.commenter.id,
      message.content.comment.parent_comment_not_found,
      errorCode.content.comment.parent_comment_not_found,
      message.content.comment.parent_commenter_block,
      errorCode.content.comment.parent_commenter_block,
    );

    // Decode the paging cursor before querying the next page of direct replies.
    const cursorDecoded = await this.decodeCommentCursor(cursor);

    // Load visible direct child comments only; blocked reply commenters are filtered in SQL.
    const childComments = await this.commentRepo.getChildComments(
      parentCommentId,
      currentUserId,
      cursorDecoded?.id,
    );

    // Return the empty-state response when the parent comment has no visible replies.
    if (childComments.length === 0) {
      return sendResponse(
        HttpStatus.OK,
        message.content.get_comment.no_content,
        {
          comments: [],
          cursor: null,
        },
      );
    }

    // Sign the next cursor from the last reply of the current page.
    const finalComment = childComments[childComments.length - 1];
    const cursorPayload: Cursor = { id: finalComment.id };
    const nextCursor = await this.jwtService.signAsync(cursorPayload);

    // Return the mapped direct replies in the same list response shape.
    return sendResponse(HttpStatus.OK, message.content.get_comment.success, {
      comments: childComments,
      cursor: nextCursor,
    });
  }
}
