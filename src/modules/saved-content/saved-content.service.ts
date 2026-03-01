import {
  BadRequestException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { sendResponse } from '../common/helper/response.helper';
import { message } from '../common/helper/message.helper';
import { errorCode } from '../common/helper/errorcode.helper';
import { SavedContentRepository } from './saved-content.repository';

/**
 * Handles save/unsave content business logic for users.
 */
@Injectable()
export class SavedContentService {
  constructor(private readonly savedContentRepo: SavedContentRepository) {}

  /**
   * BUSINESS RULE: only post content can be saved
   * Saves a post content item to the user's saved list.
   *
   * @param currentUserId ID of the current user.
   * @param contentId ID of the post content to save.
   * @returns Standardized success response when the save operation completes.
   */
  async saveContent(currentUserId: number, contentId: number) {
    // Validate user and content existence in parallel.
    const [currentUserFound, contentFound] = await Promise.all([
      this.savedContentRepo.findUserById(currentUserId),
      this.savedContentRepo.findPostById(contentId),
    ]);

    // Reject the request if the user does not exist.
    if (!currentUserFound) {
      throw new NotFoundException(
        sendResponse(
          HttpStatus.NOT_FOUND,
          message.content.save_content.user_not_found,
          undefined,
          errorCode.content.save_content.user_not_found,
        ),
      );
    }

    // Reject the request if the post content does not exist.
    if (!contentFound) {
      throw new NotFoundException(
        sendResponse(
          HttpStatus.NOT_FOUND,
          message.content.save_content.not_found,
          undefined,
          errorCode.content.save_content.not_found,
        ),
      );
    }

    // Check whether the content is already saved by this user.
    const isAlreadySaved = await this.savedContentRepo.checkSavedContent(
      contentId,
      currentUserId,
    );

    // Prevent duplicate save operations.
    if (isAlreadySaved) {
      throw new BadRequestException(
        sendResponse(
          HttpStatus.BAD_REQUEST,
          message.content.save_content.already,
          undefined,
          errorCode.content.save_content.already,
        ),
      );
    }

    // Create a new saved-content record.
    let isSaved = false;
    try {
      isSaved = await this.savedContentRepo.insertSaveContent(
        contentId,
        currentUserId,
      );
    } catch (error) {
      // Re-check existence to map race-condition DB failures into domain errors.
      const [currentUserStillExists, contentStillExists] = await Promise.all([
        this.savedContentRepo.findUserById(currentUserId),
        this.savedContentRepo.findPostById(contentId),
      ]);
      if (!currentUserStillExists) {
        throw new NotFoundException(
          sendResponse(
            HttpStatus.NOT_FOUND,
            message.content.save_content.user_not_found,
            undefined,
            errorCode.content.save_content.user_not_found,
          ),
        );
      }
      if (!contentStillExists) {
        throw new NotFoundException(
          sendResponse(
            HttpStatus.NOT_FOUND,
            message.content.save_content.not_found,
            undefined,
            errorCode.content.save_content.not_found,
          ),
        );
      }
      throw error;
    }

    // Handle unexpected insert failure.
    if (!isSaved) {
      throw new BadRequestException(
        sendResponse(
          HttpStatus.BAD_REQUEST,
          message.content.save_content.already,
          undefined,
          errorCode.content.save_content.already,
        ),
      );
    }

    // Return a standardized success response.
    return sendResponse(HttpStatus.OK, message.content.save_content.success);
  }

  /**
   * BUSINESS RULE: only post content can be saved
   * Removes a post content item from the user's saved list.
   *
   * @param currentUserId ID of the current user.
   * @param contentId ID of the post content to unsave.
   * @returns Standardized success response when the unsave operation completes.
   */
  async unsaveContent(currentUserId: number, contentId: number) {
    // Validate user and post content existence in parallel.
    const [currentUserFound, contentFound] = await Promise.all([
      this.savedContentRepo.findUserById(currentUserId),
      this.savedContentRepo.findPostById(contentId),
    ]);

    // Reject the request if the user does not exist.
    if (!currentUserFound) {
      throw new NotFoundException(
        sendResponse(
          HttpStatus.NOT_FOUND,
          message.content.unsave_content.user_not_found,
          undefined,
          errorCode.content.unsave_content.user_not_found,
        ),
      );
    }

    // Reject the request if the post content does not exist.
    if (!contentFound) {
      throw new NotFoundException(
        sendResponse(
          HttpStatus.NOT_FOUND,
          message.content.unsave_content.not_found,
          undefined,
          errorCode.content.unsave_content.not_found,
        ),
      );
    }

    // Delete the saved-content record.
    const isUnsaved = await this.savedContentRepo.deleteSaveContent(
      contentId,
      currentUserId,
    );

    // If nothing was deleted, re-check existence to avoid race-condition misclassification.
    if (!isUnsaved) {
      const [currentUserStillExists, contentStillExists] = await Promise.all([
        this.savedContentRepo.findUserById(currentUserId),
        this.savedContentRepo.findPostById(contentId),
      ]);
      if (!currentUserStillExists) {
        throw new NotFoundException(
          sendResponse(
            HttpStatus.NOT_FOUND,
            message.content.unsave_content.user_not_found,
            undefined,
            errorCode.content.unsave_content.user_not_found,
          ),
        );
      }
      if (!contentStillExists) {
        throw new NotFoundException(
          sendResponse(
            HttpStatus.NOT_FOUND,
            message.content.unsave_content.not_found,
            undefined,
            errorCode.content.unsave_content.not_found,
          ),
        );
      }
      throw new BadRequestException(
        sendResponse(
          HttpStatus.BAD_REQUEST,
          message.content.unsave_content.not_save,
          undefined,
          errorCode.content.unsave_content.not_save,
        ),
      );
    }

    // Return a standardized success response.
    return sendResponse(HttpStatus.OK, message.content.unsave_content.success);
  }
}
