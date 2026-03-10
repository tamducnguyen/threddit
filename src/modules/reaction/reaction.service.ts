import {
  BadRequestException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { sendResponse } from '../common/helper/response.helper';
import { message } from '../common/helper/message.helper';
import { errorCode } from '../common/helper/errorcode.helper';
import { ReactionRepository } from './reaction.repository';
import { ReactionTypeDTO } from './dtos/reaction-type.dto';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  JobNotificationQueue,
  NameNotificationQueue,
} from '../notification/helper/notification.helper';

@Injectable()
export class ReactionService {
  private readonly logger = new Logger(ReactionService.name);

  constructor(
    private readonly reactionRepo: ReactionRepository,
    @InjectQueue(NameNotificationQueue)
    private readonly notificationQueue: Queue,
  ) {}

  private async validateReactionAccess(
    currentUserId: number,
    targetUserId: number,
    notFoundMessage: string,
    notFoundErrorCode: string,
    targetBlockedMessage: string,
    targetBlockedErrorCode: string,
  ) {
    if (currentUserId === targetUserId) {
      return;
    }

    const [isBlockedByTarget, isTargetBlocked] = await Promise.all([
      this.reactionRepo.checkBlocked(currentUserId, targetUserId),
      this.reactionRepo.checkBlocked(targetUserId, currentUserId),
    ]);

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
   * Creates a new reaction for a content item.
   *
   * @param currentUserId Current authenticated user id.
   * @param contentId Target content id.
   * @param reactionTypeDTO Payload containing the reaction type.
   * @returns Standard success response when the reaction is created.
   */
  async createContentReaction(
    currentUserId: number,
    contentId: number,
    reactionTypeDTO: ReactionTypeDTO,
  ) {
    // Validate user and content existence in parallel to reduce latency.
    const [currentUserFound, contentFound] = await Promise.all([
      this.reactionRepo.findUserById(currentUserId),
      this.reactionRepo.findContentWithAuthorById(contentId),
    ]);

    // Stop when user does not exist.
    if (!currentUserFound) {
      throw new NotFoundException(
        sendResponse(
          HttpStatus.NOT_FOUND,
          message.content.reaction_content.user_not_found,
          undefined,
          errorCode.content.reaction_content.user_not_found,
        ),
      );
    }

    // Stop when content does not exist.
    if (!contentFound) {
      throw new NotFoundException(
        sendResponse(
          HttpStatus.NOT_FOUND,
          message.content.reaction_content.not_found,
          undefined,
          errorCode.content.reaction_content.not_found,
        ),
      );
    }

    await this.validateReactionAccess(
      currentUserId,
      contentFound.author.id,
      message.content.reaction_content.not_found,
      errorCode.content.reaction_content.not_found,
      message.content.reaction_content.target_user_block,
      errorCode.content.reaction_content.target_user_block,
    );

    // Reject duplicate reaction requests explicitly before insert.
    const existingReaction = await this.reactionRepo.findContentReactionByUser(
      contentId,
      currentUserId,
    );
    if (existingReaction) {
      throw new BadRequestException(
        sendResponse(
          HttpStatus.BAD_REQUEST,
          message.content.reaction_content.already,
          undefined,
          errorCode.content.reaction_content.already,
        ),
      );
    }

    // Insert a new reaction row for this user and content.
    let isCreated = false;
    try {
      isCreated = await this.reactionRepo.insertContentReaction(
        contentId,
        currentUserId,
        reactionTypeDTO.type,
      );
    } catch (error) {
      // Re-check existence to map race-condition DB failures into domain errors.
      const [currentUserStillExists, contentStillExists] = await Promise.all([
        this.reactionRepo.findUserById(currentUserId),
        this.reactionRepo.findContentById(contentId),
      ]);
      if (!currentUserStillExists) {
        throw new NotFoundException(
          sendResponse(
            HttpStatus.NOT_FOUND,
            message.content.reaction_content.user_not_found,
            undefined,
            errorCode.content.reaction_content.user_not_found,
          ),
        );
      }
      if (!contentStillExists) {
        throw new NotFoundException(
          sendResponse(
            HttpStatus.NOT_FOUND,
            message.content.reaction_content.not_found,
            undefined,
            errorCode.content.reaction_content.not_found,
          ),
        );
      }
      throw error;
    }

    // Insert returns false when the user already reacted before.
    if (!isCreated) {
      throw new BadRequestException(
        sendResponse(
          HttpStatus.BAD_REQUEST,
          message.content.reaction_content.already,
          undefined,
          errorCode.content.reaction_content.already,
        ),
      );
    }

    // Load inserted reaction id for notification target payload.
    const insertedReaction = await this.reactionRepo.findContentReactionByUser(
      contentId,
      currentUserId,
    );

    // Best-effort enqueue notification only when reacting to another user's content.
    const isOwnContent = contentFound.author?.id === currentUserId;
    if (insertedReaction && !isOwnContent) {
      this.notificationQueue
        .add(
          JobNotificationQueue.REACTION_CONTENT,
          {
            currentUser: currentUserFound,
            reactedContent: contentFound,
            reactionId: insertedReaction.id,
          },
          { priority: 2 },
        )
        .catch((error) => {
          this.logger.error(
            `Failed to enqueue reaction notification for content ${contentId}`,
            error instanceof Error ? error.stack : String(error),
          );
        });
    }

    // Return success response.
    return sendResponse(
      HttpStatus.OK,
      message.content.reaction_content.success,
    );
  }

  /**
   * Updates an existing reaction type for a content item.
   *
   * @param currentUserId Current authenticated user id.
   * @param contentId Target content id.
   * @param reactionTypeDTO Payload containing the new reaction type.
   * @returns Standard success response when the reaction is updated.
   */
  async updateContentReaction(
    currentUserId: number,
    contentId: number,
    reactionTypeDTO: ReactionTypeDTO,
  ) {
    // Validate user and content existence in parallel.
    const [currentUserFound, contentFound] = await Promise.all([
      this.reactionRepo.findUserById(currentUserId),
      this.reactionRepo.findContentWithAuthorById(contentId),
    ]);

    // Stop when user does not exist.
    if (!currentUserFound) {
      throw new NotFoundException(
        sendResponse(
          HttpStatus.NOT_FOUND,
          message.content.update_reaction_content.user_not_found,
          undefined,
          errorCode.content.update_reaction_content.user_not_found,
        ),
      );
    }

    // Stop when content does not exist.
    if (!contentFound) {
      throw new NotFoundException(
        sendResponse(
          HttpStatus.NOT_FOUND,
          message.content.update_reaction_content.not_found,
          undefined,
          errorCode.content.update_reaction_content.not_found,
        ),
      );
    }

    await this.validateReactionAccess(
      currentUserId,
      contentFound.author.id,
      message.content.update_reaction_content.not_found,
      errorCode.content.update_reaction_content.not_found,
      message.content.update_reaction_content.target_user_block,
      errorCode.content.update_reaction_content.target_user_block,
    );

    // Fetch current reaction to ensure this user already reacted.
    const reactionFound = await this.reactionRepo.findContentReactionByUser(
      contentId,
      currentUserId,
    );

    // Cannot update when there is no existing reaction.
    if (!reactionFound) {
      throw new BadRequestException(
        sendResponse(
          HttpStatus.BAD_REQUEST,
          message.content.update_reaction_content.not_reacted,
          undefined,
          errorCode.content.update_reaction_content.not_reacted,
        ),
      );
    }

    // Reject no-op updates when the new type equals current type.
    if (reactionFound.type === reactionTypeDTO.type) {
      throw new BadRequestException(
        sendResponse(
          HttpStatus.BAD_REQUEST,
          message.content.update_reaction_content.already,
          undefined,
          errorCode.content.update_reaction_content.already,
        ),
      );
    }

    // Update the reaction type.
    const isUpdated = await this.reactionRepo.updateReactionTypeById(
      reactionFound.id,
      reactionTypeDTO.type,
    );

    // Handle race condition where reaction is removed between read and update.
    if (!isUpdated) {
      throw new BadRequestException(
        sendResponse(
          HttpStatus.BAD_REQUEST,
          message.content.update_reaction_content.not_reacted,
          undefined,
          errorCode.content.update_reaction_content.not_reacted,
        ),
      );
    }

    // Return success response.
    return sendResponse(
      HttpStatus.OK,
      message.content.update_reaction_content.success,
    );
  }

  /**
   * Deletes the current user's reaction from a content item.
   *
   * @param currentUserId Current authenticated user id.
   * @param contentId Target content id.
   * @returns Standard success response when the reaction is deleted.
   */
  async deleteContentReaction(currentUserId: number, contentId: number) {
    // Validate user and content existence in parallel.
    const [currentUserFound, contentFound] = await Promise.all([
      this.reactionRepo.findUserById(currentUserId),
      this.reactionRepo.findContentWithAuthorById(contentId),
    ]);

    // Stop when user does not exist.
    if (!currentUserFound) {
      throw new NotFoundException(
        sendResponse(
          HttpStatus.NOT_FOUND,
          message.content.delete_reaction_content.user_not_found,
          undefined,
          errorCode.content.delete_reaction_content.user_not_found,
        ),
      );
    }

    // Stop when content does not exist.
    if (!contentFound) {
      throw new NotFoundException(
        sendResponse(
          HttpStatus.NOT_FOUND,
          message.content.delete_reaction_content.not_found,
          undefined,
          errorCode.content.delete_reaction_content.not_found,
        ),
      );
    }

    await this.validateReactionAccess(
      currentUserId,
      contentFound.author.id,
      message.content.delete_reaction_content.not_found,
      errorCode.content.delete_reaction_content.not_found,
      message.content.delete_reaction_content.target_user_block,
      errorCode.content.delete_reaction_content.target_user_block,
    );

    // Delete the reaction row for this user and content.
    const isDeleted = await this.reactionRepo.deleteContentReaction(
      contentId,
      currentUserId,
    );

    // Delete returns false when user has not reacted yet.
    if (!isDeleted) {
      throw new BadRequestException(
        sendResponse(
          HttpStatus.BAD_REQUEST,
          message.content.delete_reaction_content.not_reacted,
          undefined,
          errorCode.content.delete_reaction_content.not_reacted,
        ),
      );
    }

    // Return success response.
    return sendResponse(
      HttpStatus.OK,
      message.content.delete_reaction_content.success,
    );
  }

  /**
   * Creates a new reaction for a comment.
   *
   * Business rules:
   * - the current user and target comment must exist
   * - block rules must pass against both the content author and comment owner
   * - the current user can react to a given comment at most once
   * - creating a reaction on someone else's comment enqueues a notification
   *
   * @param currentUserId Current authenticated user id.
   * @param commentId Target comment id.
   * @param reactionTypeDTO Payload containing the reaction type.
   * @returns Standard success response when the reaction is created.
   */
  async createCommentReaction(
    currentUserId: number,
    commentId: number,
    reactionTypeDTO: ReactionTypeDTO,
  ) {
    // Validate user and target comment existence in parallel.
    const [currentUserFound, commentFound] = await Promise.all([
      this.reactionRepo.findUserById(currentUserId),
      this.reactionRepo.findCommentWithCommenterById(commentId),
    ]);

    // Stop when current user does not exist.
    if (!currentUserFound) {
      throw new NotFoundException(
        sendResponse(
          HttpStatus.NOT_FOUND,
          message.content.reaction_comment.user_not_found,
          undefined,
          errorCode.content.reaction_comment.user_not_found,
        ),
      );
    }

    // Stop when target comment does not exist.
    if (!commentFound) {
      throw new NotFoundException(
        sendResponse(
          HttpStatus.NOT_FOUND,
          message.content.reaction_comment.not_found,
          undefined,
          errorCode.content.reaction_comment.not_found,
        ),
      );
    }

    // Enforce block rules against both the post author and comment owner.
    const createCommentTargetUserIds = [
      ...new Set([commentFound.content.author.id, commentFound.commenter.id]),
    ];
    await Promise.all(
      createCommentTargetUserIds.map((targetUserId) =>
        this.validateReactionAccess(
          currentUserId,
          targetUserId,
          message.content.reaction_comment.not_found,
          errorCode.content.reaction_comment.not_found,
          message.content.reaction_comment.target_user_block,
          errorCode.content.reaction_comment.target_user_block,
        ),
      ),
    );

    // Reject duplicate reactions before inserting a new row.
    const existingReaction = await this.reactionRepo.findCommentReactionByUser(
      commentId,
      currentUserId,
    );
    if (existingReaction) {
      throw new BadRequestException(
        sendResponse(
          HttpStatus.BAD_REQUEST,
          message.content.reaction_comment.already,
          undefined,
          errorCode.content.reaction_comment.already,
        ),
      );
    }

    // Insert the reaction row and remap race conditions into domain errors.
    let isCreated = false;
    try {
      isCreated = await this.reactionRepo.insertCommentReaction(
        commentId,
        currentUserId,
        reactionTypeDTO.type,
      );
    } catch (error) {
      const [currentUserStillExists, commentStillExists] = await Promise.all([
        this.reactionRepo.findUserById(currentUserId),
        this.reactionRepo.findCommentById(commentId),
      ]);
      if (!currentUserStillExists) {
        throw new NotFoundException(
          sendResponse(
            HttpStatus.NOT_FOUND,
            message.content.reaction_comment.user_not_found,
            undefined,
            errorCode.content.reaction_comment.user_not_found,
          ),
        );
      }
      if (!commentStillExists) {
        throw new NotFoundException(
          sendResponse(
            HttpStatus.NOT_FOUND,
            message.content.reaction_comment.not_found,
            undefined,
            errorCode.content.reaction_comment.not_found,
          ),
        );
      }
      throw error;
    }

    // Treat ignored inserts as "already reacted".
    if (!isCreated) {
      throw new BadRequestException(
        sendResponse(
          HttpStatus.BAD_REQUEST,
          message.content.reaction_comment.already,
          undefined,
          errorCode.content.reaction_comment.already,
        ),
      );
    }

    // Load the inserted reaction id for notification target payload.
    const insertedReaction = await this.reactionRepo.findCommentReactionByUser(
      commentId,
      currentUserId,
    );

    // Notify the comment owner only when another user reacts.
    const isOwnComment = commentFound.commenter?.id === currentUserId;
    if (insertedReaction && !isOwnComment) {
      this.notificationQueue
        .add(
          JobNotificationQueue.REACTION_COMMENT,
          {
            currentUser: currentUserFound,
            reactedComment: commentFound,
            reactionId: insertedReaction.id,
          },
          { priority: 2 },
        )
        .catch((error) => {
          this.logger.error(
            `Failed to enqueue reaction notification for comment ${commentId}`,
            error instanceof Error ? error.stack : String(error),
          );
        });
    }

    // Return success response after the reaction is persisted.
    return sendResponse(
      HttpStatus.OK,
      message.content.reaction_comment.success,
    );
  }

  /**
   * Updates an existing reaction type for a comment.
   *
   * Business rules:
   * - the current user and target comment must exist
   * - block rules must pass against both the content author and comment owner
   * - the current user must already have a reaction on the target comment
   * - updating to the same reaction type is rejected as a no-op
   *
   * @param currentUserId Current authenticated user id.
   * @param commentId Target comment id.
   * @param reactionTypeDTO Payload containing the new reaction type.
   * @returns Standard success response when the reaction is updated.
   */
  async updateCommentReaction(
    currentUserId: number,
    commentId: number,
    reactionTypeDTO: ReactionTypeDTO,
  ) {
    // Validate user and target comment existence in parallel.
    const [currentUserFound, commentFound] = await Promise.all([
      this.reactionRepo.findUserById(currentUserId),
      this.reactionRepo.findCommentWithCommenterById(commentId),
    ]);

    // Stop when current user does not exist.
    if (!currentUserFound) {
      throw new NotFoundException(
        sendResponse(
          HttpStatus.NOT_FOUND,
          message.content.update_reaction_comment.user_not_found,
          undefined,
          errorCode.content.update_reaction_comment.user_not_found,
        ),
      );
    }

    // Stop when target comment does not exist.
    if (!commentFound) {
      throw new NotFoundException(
        sendResponse(
          HttpStatus.NOT_FOUND,
          message.content.update_reaction_comment.not_found,
          undefined,
          errorCode.content.update_reaction_comment.not_found,
        ),
      );
    }

    // Enforce block rules against both the post author and comment owner.
    const updateCommentTargetUserIds = [
      ...new Set([commentFound.content.author.id, commentFound.commenter.id]),
    ];
    await Promise.all(
      updateCommentTargetUserIds.map((targetUserId) =>
        this.validateReactionAccess(
          currentUserId,
          targetUserId,
          message.content.update_reaction_comment.not_found,
          errorCode.content.update_reaction_comment.not_found,
          message.content.update_reaction_comment.target_user_block,
          errorCode.content.update_reaction_comment.target_user_block,
        ),
      ),
    );

    // Load the current reaction so only existing reactions can be updated.
    const reactionFound = await this.reactionRepo.findCommentReactionByUser(
      commentId,
      currentUserId,
    );

    // Reject updates when the user has not reacted yet.
    if (!reactionFound) {
      throw new BadRequestException(
        sendResponse(
          HttpStatus.BAD_REQUEST,
          message.content.update_reaction_comment.not_reacted,
          undefined,
          errorCode.content.update_reaction_comment.not_reacted,
        ),
      );
    }

    // Reject no-op updates where the new type matches the stored type.
    if (reactionFound.type === reactionTypeDTO.type) {
      throw new BadRequestException(
        sendResponse(
          HttpStatus.BAD_REQUEST,
          message.content.update_reaction_comment.already,
          undefined,
          errorCode.content.update_reaction_comment.already,
        ),
      );
    }

    // Update the reaction type in place.
    const isUpdated = await this.reactionRepo.updateReactionTypeById(
      reactionFound.id,
      reactionTypeDTO.type,
    );

    // Handle races where the reaction disappears before the update executes.
    if (!isUpdated) {
      throw new BadRequestException(
        sendResponse(
          HttpStatus.BAD_REQUEST,
          message.content.update_reaction_comment.not_reacted,
          undefined,
          errorCode.content.update_reaction_comment.not_reacted,
        ),
      );
    }

    // Return success response after the reaction type is updated.
    return sendResponse(
      HttpStatus.OK,
      message.content.update_reaction_comment.success,
    );
  }

  /**
   * Deletes the current user's reaction from a comment.
   *
   * Business rules:
   * - the current user and target comment must exist
   * - block rules must pass against both the content author and comment owner
   * - the current user must already have a reaction on the target comment
   *
   * @param currentUserId Current authenticated user id.
   * @param commentId Target comment id.
   * @returns Standard success response when the reaction is deleted.
   */
  async deleteCommentReaction(currentUserId: number, commentId: number) {
    // Validate user and target comment existence in parallel.
    const [currentUserFound, commentFound] = await Promise.all([
      this.reactionRepo.findUserById(currentUserId),
      this.reactionRepo.findCommentWithCommenterById(commentId),
    ]);

    // Stop when current user does not exist.
    if (!currentUserFound) {
      throw new NotFoundException(
        sendResponse(
          HttpStatus.NOT_FOUND,
          message.content.delete_reaction_comment.user_not_found,
          undefined,
          errorCode.content.delete_reaction_comment.user_not_found,
        ),
      );
    }

    // Stop when target comment does not exist.
    if (!commentFound) {
      throw new NotFoundException(
        sendResponse(
          HttpStatus.NOT_FOUND,
          message.content.delete_reaction_comment.not_found,
          undefined,
          errorCode.content.delete_reaction_comment.not_found,
        ),
      );
    }

    // Enforce block rules against both the post author and comment owner.
    const deleteCommentTargetUserIds = [
      ...new Set([commentFound.content.author.id, commentFound.commenter.id]),
    ];
    await Promise.all(
      deleteCommentTargetUserIds.map((targetUserId) =>
        this.validateReactionAccess(
          currentUserId,
          targetUserId,
          message.content.delete_reaction_comment.not_found,
          errorCode.content.delete_reaction_comment.not_found,
          message.content.delete_reaction_comment.target_user_block,
          errorCode.content.delete_reaction_comment.target_user_block,
        ),
      ),
    );

    // Delete the stored reaction for this user and comment.
    const isDeleted = await this.reactionRepo.deleteCommentReaction(
      commentId,
      currentUserId,
    );

    // Reject deletes when the user has not reacted yet.
    if (!isDeleted) {
      throw new BadRequestException(
        sendResponse(
          HttpStatus.BAD_REQUEST,
          message.content.delete_reaction_comment.not_reacted,
          undefined,
          errorCode.content.delete_reaction_comment.not_reacted,
        ),
      );
    }

    // Return success response after the reaction is removed.
    return sendResponse(
      HttpStatus.OK,
      message.content.delete_reaction_comment.success,
    );
  }
}
