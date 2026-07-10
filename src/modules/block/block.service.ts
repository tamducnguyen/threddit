import { Injectable } from '@nestjs/common';
import {
  BlockDeleteBlockCantSelfUnblockException,
  BlockDeleteBlockNotBlockedException,
  BlockDeleteBlockUserNotFoundException,
  BlockGetBlockStatusCantSelfCheckException,
  BlockGetBlockStatusUserNotFoundException,
  BlockGetBlockedListCursorInvalidException,
  BlockGetBlockedListUserNotFoundException,
  BlockPostBlockAlreadyBlockedException,
  BlockPostBlockCantSelfBlockException,
  BlockPostBlockUserNotFoundException,
  BlockedOrNotFoundException,
  SelfBlockedTargetException,
} from '../../common/exception';
import { BlockRepository } from './block.repository';
import { AuthUser } from '../token/authuser.interface';
import { JwtService } from '@nestjs/jwt';
import { Cursor } from '../../common/interface/cursor.interface';
import { ConfigService } from '@nestjs/config';
import { QueryFailedError } from 'typeorm';
import { ConvertMediaRelativePathToUrl } from '../../common/helper/media-url.helper';

@Injectable()
export class BlockService {
  constructor(
    private readonly blockRepo: BlockRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  private mapBlockedUser(user: {
    email: string;
    username: string;
    displayName: string;
    avatarRelativePath?: string | null;
    backgroundImageRelativePath?: string | null;
    gender: unknown;
    dateOfBirth: Date | null;
  }) {
    const avatarUrl = user.avatarRelativePath
      ? ConvertMediaRelativePathToUrl(
          this.configService,
          user.avatarRelativePath,
        )
      : null;
    const backgroundImageUrl = user.backgroundImageRelativePath
      ? ConvertMediaRelativePathToUrl(
          this.configService,
          user.backgroundImageRelativePath,
        )
      : null;
    return {
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: avatarUrl,
      backgroundImageUrl: backgroundImageUrl,
      gender: user.gender,
      dateOfBirth: user.dateOfBirth,
    };
  }
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
  async validateBlock(
    currentUserId: number,
    targetUserId: number,
  ): Promise<void> {
    if (currentUserId === targetUserId) return;

    const [isTargetBlocked, isBlockedByTarget] = await Promise.all([
      this.blockRepo.checkBlocked(currentUserId, targetUserId),
      this.blockRepo.checkBlocked(targetUserId, currentUserId),
    ]);

    if (isBlockedByTarget) {
      throw new BlockedOrNotFoundException();
    }
    if (isTargetBlocked) {
      throw new SelfBlockedTargetException();
    }
  }

  /**
   * Bulk variant of `validateBlock` for checking block relationships against
   * a list of target users at once (e.g. every commenter in a comment chain).
   */
  async validateBlockMany(
    currentUserId: number,
    targetUserIds: number[],
  ): Promise<void> {
    const others = targetUserIds.filter((id) => id !== currentUserId);
    if (others.length === 0) return;

    const [isBlockedByAnyTarget, isAnyTargetBlocked] = await Promise.all([
      this.blockRepo.isBlockedByAnyTarget(currentUserId, others),
      this.blockRepo.isAnyTargetBlockedByCurrentUser(currentUserId, others),
    ]);

    if (isBlockedByAnyTarget) {
      throw new BlockedOrNotFoundException();
    }
    if (isAnyTargetBlocked) {
      throw new SelfBlockedTargetException();
    }
  }

  /**
   * One-directional variant of `validateBlock` — only hides the resource
   * when the target has blocked the current user. Does not reject when the
   * current user has blocked the target (e.g. unfriending someone you've
   * blocked should still be allowed).
   */
  async validateNotBlockedByTarget(
    currentUserId: number,
    targetUserId: number,
  ): Promise<void> {
    if (currentUserId === targetUserId) return;

    const isBlockedByTarget = await this.blockRepo.checkBlocked(
      currentUserId,
      targetUserId,
    );
    if (isBlockedByTarget) {
      throw new BlockedOrNotFoundException();
    }
  }

  async block(currentUser: AuthUser, blockedUsername: string) {
    // ensure current user exists
    const blockerFound = await this.blockRepo.findUserById(currentUser.sub);
    if (!blockerFound) {
      throw new BlockPostBlockUserNotFoundException();
    }

    // ensure target user exists
    const blockedUserFound =
      await this.blockRepo.findUserByUsername(blockedUsername);
    if (!blockedUserFound) {
      throw new BlockPostBlockUserNotFoundException();
    }

    // prevent blocking self
    if (currentUser.sub === blockedUserFound.id) {
      throw new BlockPostBlockCantSelfBlockException();
    }

    // hide existence if current user is blocked by target user
    const isBlockedByTarget = await this.blockRepo.checkBlocked(
      blockedUserFound.id,
      blockerFound.id,
    );
    if (isBlockedByTarget) {
      throw new BlockPostBlockUserNotFoundException();
    }

    // avoid duplicate block
    const isBlocked = await this.blockRepo.checkBlocked(
      blockerFound.id,
      blockedUserFound.id,
    );
    if (isBlocked) {
      throw new BlockPostBlockAlreadyBlockedException();
    }

    // create block and remove follow/friendship if present
    try {
      await this.blockRepo.createBlockAndCleanup(
        blockerFound,
        blockedUserFound,
      );
    } catch (err: unknown) {
      if (
        err instanceof QueryFailedError &&
        // postgres unique violation
        (err as { code?: string }).code === '23505'
      ) {
        throw new BlockPostBlockAlreadyBlockedException();
      }
      throw err;
    }

    // return success response
    return { kind: 'success' };
  }

  async unblock(currentUser: AuthUser, blockedUsername: string) {
    // ensure target user exists
    const blockedUserFound =
      await this.blockRepo.findUserByUsername(blockedUsername);
    if (!blockedUserFound) {
      throw new BlockDeleteBlockUserNotFoundException();
    }

    // prevent unblocking self
    if (currentUser.sub === blockedUserFound.id) {
      throw new BlockDeleteBlockCantSelfUnblockException();
    }

    // hide existence if current user is blocked by target user
    const isBlockedByTarget = await this.blockRepo.checkBlocked(
      blockedUserFound.id,
      currentUser.sub,
    );
    if (isBlockedByTarget) {
      throw new BlockDeleteBlockUserNotFoundException();
    }

    // ensure block exists
    const isBlocked = await this.blockRepo.checkBlocked(
      currentUser.sub,
      blockedUserFound.id,
    );
    if (!isBlocked) {
      throw new BlockDeleteBlockNotBlockedException();
    }

    // delete block record
    await this.blockRepo.deleteBlock(currentUser.sub, blockedUserFound.id);

    // return success response
    return { kind: 'success' };
  }

  async getBlockedList(currentUser: AuthUser, key?: string, cursor?: string) {
    // ensure current user exists
    const blockerFound = await this.blockRepo.findUserById(currentUser.sub);
    if (!blockerFound) {
      throw new BlockGetBlockedListUserNotFoundException();
    }

    // verify and decode cursor if provided
    let cursorDecoded: Cursor | undefined;
    if (cursor) {
      try {
        cursorDecoded = await this.jwtService.verifyAsync<Cursor>(cursor);
      } catch {
        throw new BlockGetBlockedListCursorInvalidException();
      }
    } else {
      cursorDecoded = undefined;
    }

    // query blocked users
    const blockedListRaw = await this.blockRepo.findBlockedUsers(
      blockerFound.id,
      cursorDecoded,
      key,
    );

    const blockedFinal = blockedListRaw[blockedListRaw.length - 1];
    if (!blockedFinal) {
      return { kind: 'success', data: { blockedList: [], cursor: null } };
    }

    // map response data
    const blockedList = blockedListRaw.map((block) => ({
      blockedUser: this.mapBlockedUser(block.blockedUser),
      createdAt: block.createdAt,
    }));

    // sign next cursor
    const cursorPayload: Cursor = { id: blockedFinal.id };
    const cursorToken = await this.jwtService.signAsync(cursorPayload);

    return {
      kind: 'success',
      data: {
        blockedList: blockedList,
        cursor: cursorToken,
      },
    };
  }

  async getBlockStatus(currentUser: AuthUser, targetUsername: string) {
    // ensure target user exists
    const targetUserFound =
      await this.blockRepo.findUserByUsername(targetUsername);
    if (!targetUserFound) {
      throw new BlockGetBlockStatusUserNotFoundException();
    }

    // prevent checking self
    if (currentUser.sub === targetUserFound.id) {
      throw new BlockGetBlockStatusCantSelfCheckException();
    }

    // hide existence if current user is blocked by target user
    const isBlockedByTarget = await this.blockRepo.checkBlocked(
      targetUserFound.id,
      currentUser.sub,
    );
    if (isBlockedByTarget) {
      throw new BlockGetBlockStatusUserNotFoundException();
    }

    // check block status
    const isBlocked = await this.blockRepo.checkBlocked(
      currentUser.sub,
      targetUserFound.id,
    );

    return {
      kind: 'success',
      data: {
        isBlocked: isBlocked,
      },
    };
  }
  async getBlockedUserCount(currentUserId: number) {
    const blockedUserCount =
      await this.blockRepo.getBlockedUserCount(currentUserId);
    return { kind: 'success', data: blockedUserCount };
  }
}
