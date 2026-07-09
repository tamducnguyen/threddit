import { Injectable } from '@nestjs/common';
import {
  ContentShareContentAlreadyException,
  ContentShareContentNotFoundException,
  ContentShareContentTargetUserBlockException,
  ContentShareContentUserNotFoundException,
  ContentUnshareContentNotFoundException,
  ContentUnshareContentNotShareException,
  ContentUnshareContentTargetUserBlockException,
  ContentUnshareContentUserNotFoundException,
  ContentUpdateShareContentNoFieldToUpdateException,
  ContentUpdateShareContentNotFoundException,
  ContentUpdateShareContentNotShareException,
  ContentUpdateShareContentTargetUserBlockException,
  ContentUpdateShareContentUserNotFoundException,
  ServiceExceptionClass,
} from '../../common/exception';
import { ShareRepository } from './share.repository';
import { ShareContentDTO } from './dtos/share-content.dto';
import { HttpsService } from '../http/http.service';

/**
 * Handles share/unshare content business logic for users.
 */
@Injectable()
export class ShareService {
  constructor(
    private readonly shareRepo: ShareRepository,
    private readonly httpsService: HttpsService,
  ) {}

  /**
   * Validates block relationship before allowing share interactions.
   *
   * @param currentUserId Current authenticated user id.
   * @param targetUserId Post author user id.
   * @param notFoundMessage Message used when current user is blocked by target.
   * @param notFoundErrorCode Error code used when current user is blocked by target.
   * @param targetBlockedMessage Message used when current user has blocked target.
   * @param targetBlockedErrorCode Error code used when current user has blocked target.
   */
  private async validateShareAccess(
    currentUserId: number,
    targetUserId: number,
    NotFoundException: ServiceExceptionClass,
    TargetBlockedException: ServiceExceptionClass,
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
      throw new NotFoundException();
    }

    // Reject request when current user has blocked target user.
    if (isTargetBlocked) {
      throw new TargetBlockedException();
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
      throw new ContentShareContentUserNotFoundException();
    }

    // Reject the request if the content does not exist.
    if (!contentFound) {
      throw new ContentShareContentNotFoundException();
    }

    // Hide own post from share endpoint to prevent self-share behavior.
    if (contentFound.author.id === currentUserId) {
      throw new ContentShareContentNotFoundException();
    }

    // Enforce block policy before sharing target post.
    await this.validateShareAccess(
      currentUserId,
      contentFound.author.id,
      ContentShareContentNotFoundException,
      ContentShareContentTargetUserBlockException,
    );

    // Prevent duplicate share operations.
    const isAlreadyShared = await this.shareRepo.checkSharedContent(
      contentId,
      currentUserId,
    );
    if (isAlreadyShared) {
      throw new ContentShareContentAlreadyException();
    }

    // Normalize optional share message before persisting.
    const normalizedShareMessage = shareContentDTO.message?.trim();
    const shareMessage = normalizedShareMessage ? normalizedShareMessage : null;
    // Validate toxicity only when user provides non-empty share message.
    if (shareMessage) {
      await this.httpsService.checkToxic(shareMessage);
    }

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
        throw new ContentShareContentUserNotFoundException();
      }
      if (!contentStillExists) {
        throw new ContentShareContentNotFoundException();
      }
      throw error;
    }

    // Insert returns false when the user already shared before.
    if (!isShared) {
      throw new ContentShareContentAlreadyException();
    }

    // Return standardized success response.
    return { kind: 'success' };
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
      throw new ContentUpdateShareContentUserNotFoundException();
    }

    // Reject the request if the content does not exist.
    if (!contentFound) {
      throw new ContentUpdateShareContentNotFoundException();
    }

    // Enforce block policy before updating target share entry.
    await this.validateShareAccess(
      currentUserId,
      contentFound.author.id,
      ContentUpdateShareContentNotFoundException,
      ContentUpdateShareContentTargetUserBlockException,
    );

    // Reject empty payload to avoid ambiguous update behavior.
    if (shareContentDTO.message === undefined) {
      throw new ContentUpdateShareContentNoFieldToUpdateException();
    }

    // Ensure there is an existing share record before update.
    const isAlreadyShared = await this.shareRepo.checkSharedContent(
      contentId,
      currentUserId,
    );
    if (!isAlreadyShared) {
      throw new ContentUpdateShareContentNotShareException();
    }

    // Normalize share message before update.
    const shareMessage =
      shareContentDTO.message === null ? null : shareContentDTO.message.trim();
    // Validate toxicity only when user provides non-empty share message.
    if (shareMessage) {
      await this.httpsService.checkToxic(shareMessage);
    }

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
        throw new ContentUpdateShareContentUserNotFoundException();
      }
      if (!contentStillExists) {
        throw new ContentUpdateShareContentNotFoundException();
      }
      throw new ContentUpdateShareContentNotShareException();
    }

    // Return standardized success response.
    return { kind: 'success' };
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
      throw new ContentUnshareContentUserNotFoundException();
    }

    // Reject the request if the content does not exist.
    if (!contentFound) {
      throw new ContentUnshareContentNotFoundException();
    }

    // Enforce block policy before removing target share entry.
    await this.validateShareAccess(
      currentUserId,
      contentFound.author.id,
      ContentUnshareContentNotFoundException,
      ContentUnshareContentTargetUserBlockException,
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
        throw new ContentUnshareContentUserNotFoundException();
      }
      if (!contentStillExists) {
        throw new ContentUnshareContentNotFoundException();
      }
      throw new ContentUnshareContentNotShareException();
    }

    // Return standardized success response.
    return { kind: 'success' };
  }
}
