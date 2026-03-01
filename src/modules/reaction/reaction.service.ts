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
      this.reactionRepo.findContentById(contentId),
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
      this.reactionRepo.findContentById(contentId),
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
}
