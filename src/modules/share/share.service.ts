import {
  BadRequestException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { sendResponse } from '../common/helper/response.helper';
import { message } from '../common/helper/message.helper';
import { ShareRepository } from './share.repository';
import { ShareContentDTO } from './dtos/share-content.dto';

/**
 * Handles share/unshare content business logic for users.
 */
@Injectable()
export class ShareService {
  constructor(private readonly shareRepo: ShareRepository) {}

  /**
   * Validates block relationship before allowing share interactions.
   *
   * @param currentUserId Current authenticated user id.
   * @param targetUserId Post author user id.
   * @param notFoundMessage Message used when current user is blocked by target.
   * @param targetBlockedMessage Message used when current user has blocked target.
   */
  private async validateShareAccess(
    currentUserId: number,
    targetUserId: number,
    notFoundMessage: string,
    targetBlockedMessage: string,
  ) {
    // No block check is required when interacting with own post.
    if (currentUserId === targetUserId) {
      return;
    }

    // Check both block directions in parallel.
    const [isBlockedByTarget, isTargetBlocked] = await Promise.all([
      this.shareRepo.checkBlocked(currentUserId, targetUserId),
      this.shareRepo.checkBlocked(targetUserId, currentUserId),
    ]);

    // Hide content when target user has blocked current user.
    if (isBlockedByTarget) {
      throw new NotFoundException(notFoundMessage);
    }

    // Reject request when current user has blocked target user.
    if (isTargetBlocked) {
      throw new BadRequestException(targetBlockedMessage);
    }
  }

  /**
   * Shares a content item for the current user.
   *
   * @param currentUserId ID of the current user.
   * @param contentId ID of the target content.
   * @param shareContentDTO Payload containing optional share message.
   * @returns Standardized success response when the share operation completes.
   */
  async shareContent(
    currentUserId: number,
    contentId: number,
    shareContentDTO: ShareContentDTO,
  ) {
    // Validate user and content existence in parallel.
    const [currentUserFound, contentFound] = await Promise.all([
      this.shareRepo.findUserById(currentUserId),
      this.shareRepo.findPostWithAuthorById(contentId),
    ]);

    // Reject the request if the user does not exist.
    if (!currentUserFound) {
      throw new NotFoundException(message.content.share_content.user_not_found);
    }

    // Reject the request if the content does not exist.
    if (!contentFound) {
      throw new NotFoundException(message.content.share_content.not_found);
    }

    // Enforce block policy before sharing target post.
    await this.validateShareAccess(
      currentUserId,
      contentFound.author.id,
      message.content.share_content.not_found,
      message.content.share_content.target_user_block,
    );

    // Prevent duplicate share operations.
    const isAlreadyShared = await this.shareRepo.checkSharedContent(
      contentId,
      currentUserId,
    );
    if (isAlreadyShared) {
      throw new BadRequestException(message.content.share_content.already);
    }

    // Normalize optional share message before persisting.
    const normalizedShareMessage = shareContentDTO.message?.trim();
    const shareMessage = normalizedShareMessage ? normalizedShareMessage : null;

    // Create a new share record.
    let isShared = false;
    try {
      isShared = await this.shareRepo.insertShareContent(
        contentId,
        currentUserId,
        shareMessage,
      );
    } catch (error) {
      // Re-check existence to map race-condition DB failures into domain errors.
      const [currentUserStillExists, contentStillExists] = await Promise.all([
        this.shareRepo.findUserById(currentUserId),
        this.shareRepo.findPostWithAuthorById(contentId),
      ]);
      if (!currentUserStillExists) {
        throw new NotFoundException(
          message.content.share_content.user_not_found,
        );
      }
      if (!contentStillExists) {
        throw new NotFoundException(message.content.share_content.not_found);
      }
      throw error;
    }

    // Insert returns false when the user already shared before.
    if (!isShared) {
      throw new BadRequestException(message.content.share_content.already);
    }

    // Return standardized success response.
    return sendResponse(HttpStatus.OK, message.content.share_content.success);
  }

  /**
   * Updates share message for a shared content entry of the current user.
   *
   * @param currentUserId ID of the current user.
   * @param contentId ID of the target content.
   * @param shareContentDTO Payload containing updated share message.
   * @returns Standardized success response when the update operation completes.
   */
  async updateShareContent(
    currentUserId: number,
    contentId: number,
    shareContentDTO: ShareContentDTO,
  ) {
    // Validate user and content existence in parallel.
    const [currentUserFound, contentFound] = await Promise.all([
      this.shareRepo.findUserById(currentUserId),
      this.shareRepo.findPostWithAuthorById(contentId),
    ]);

    // Reject the request if the user does not exist.
    if (!currentUserFound) {
      throw new NotFoundException(
        message.content.update_share_content.user_not_found,
      );
    }

    // Reject the request if the content does not exist.
    if (!contentFound) {
      throw new NotFoundException(
        message.content.update_share_content.not_found,
      );
    }

    // Enforce block policy before updating target share entry.
    await this.validateShareAccess(
      currentUserId,
      contentFound.author.id,
      message.content.update_share_content.not_found,
      message.content.update_share_content.target_user_block,
    );

    // Reject empty payload to avoid ambiguous update behavior.
    if (shareContentDTO.message === undefined) {
      throw new BadRequestException(
        message.content.update_share_content.no_field_to_update,
      );
    }

    // Ensure there is an existing share record before update.
    const isAlreadyShared = await this.shareRepo.checkSharedContent(
      contentId,
      currentUserId,
    );
    if (!isAlreadyShared) {
      throw new BadRequestException(
        message.content.update_share_content.not_share,
      );
    }

    // Normalize share message before update.
    const shareMessage =
      shareContentDTO.message === null ? null : shareContentDTO.message.trim();

    // Update share message in database.
    const isUpdated = await this.shareRepo.updateShareContentMessage(
      contentId,
      currentUserId,
      shareMessage,
    );

    // Handle race condition when share is removed between check and update.
    if (!isUpdated) {
      const [currentUserStillExists, contentStillExists] = await Promise.all([
        this.shareRepo.findUserById(currentUserId),
        this.shareRepo.findPostWithAuthorById(contentId),
      ]);
      if (!currentUserStillExists) {
        throw new NotFoundException(
          message.content.update_share_content.user_not_found,
        );
      }
      if (!contentStillExists) {
        throw new NotFoundException(
          message.content.update_share_content.not_found,
        );
      }
      throw new BadRequestException(
        message.content.update_share_content.not_share,
      );
    }

    // Return standardized success response.
    return sendResponse(
      HttpStatus.OK,
      message.content.update_share_content.success,
    );
  }

  /**
   * Removes a shared content entry for the current user.
   *
   * @param currentUserId ID of the current user.
   * @param contentId ID of the target content.
   * @returns Standardized success response when the unshare operation completes.
   */
  async unshareContent(currentUserId: number, contentId: number) {
    // Validate user and content existence in parallel.
    const [currentUserFound, contentFound] = await Promise.all([
      this.shareRepo.findUserById(currentUserId),
      this.shareRepo.findPostWithAuthorById(contentId),
    ]);

    // Reject the request if the user does not exist.
    if (!currentUserFound) {
      throw new NotFoundException(
        message.content.unshare_content.user_not_found,
      );
    }

    // Reject the request if the content does not exist.
    if (!contentFound) {
      throw new NotFoundException(message.content.unshare_content.not_found);
    }

    // Enforce block policy before removing target share entry.
    await this.validateShareAccess(
      currentUserId,
      contentFound.author.id,
      message.content.unshare_content.not_found,
      message.content.unshare_content.target_user_block,
    );

    // Delete the share record for current user and content.
    const isUnshared = await this.shareRepo.deleteShareContent(
      contentId,
      currentUserId,
    );

    // Re-check existence when delete is not affected to avoid race misclassification.
    if (!isUnshared) {
      const [currentUserStillExists, contentStillExists] = await Promise.all([
        this.shareRepo.findUserById(currentUserId),
        this.shareRepo.findPostWithAuthorById(contentId),
      ]);
      if (!currentUserStillExists) {
        throw new NotFoundException(
          message.content.unshare_content.user_not_found,
        );
      }
      if (!contentStillExists) {
        throw new NotFoundException(message.content.unshare_content.not_found);
      }
      throw new BadRequestException(message.content.unshare_content.not_share);
    }

    // Return standardized success response.
    return sendResponse(HttpStatus.OK, message.content.unshare_content.success);
  }
}
