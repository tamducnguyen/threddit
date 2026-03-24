import {
  BadRequestException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BlockRepository } from './block.repository';
import { AuthUser } from '../token/authuser.interface';
import { sendResponse } from '../common/helper/response.helper';
import { message } from '../common/helper/message.helper';
import { errorCode } from '../common/helper/errorcode.helper';
import { JwtService } from '@nestjs/jwt';
import { Cursor } from '../interface/cursor.interface';
import { ConfigService } from '@nestjs/config';
import { QueryFailedError } from 'typeorm';
import { ConvertMediaRelativePathToUrl } from '../common/helper/media-url.helper';

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
  async block(currentUser: AuthUser, blockedUsername: string) {
    // prevent blocking self
    if (currentUser.username === blockedUsername) {
      throw new BadRequestException(
        sendResponse(
          HttpStatus.BAD_REQUEST,
          message.block.post_block.cant_self_block,
          undefined,
          errorCode.block.post_block.cant_self_block,
        ),
      );
    }

    // ensure current user exists
    const blockerFound = await this.blockRepo.findUserById(currentUser.sub);
    if (!blockerFound) {
      throw new NotFoundException(
        sendResponse(
          HttpStatus.NOT_FOUND,
          message.block.post_block.user_not_found,
          undefined,
          errorCode.block.post_block.user_not_found,
        ),
      );
    }

    // ensure target user exists
    const blockedUserFound =
      await this.blockRepo.findUserByUsername(blockedUsername);
    if (!blockedUserFound) {
      throw new NotFoundException(
        sendResponse(
          HttpStatus.NOT_FOUND,
          message.block.post_block.user_not_found,
          undefined,
          errorCode.block.post_block.user_not_found,
        ),
      );
    }

    // hide existence if current user is blocked by target user
    const isBlockedByTarget = await this.blockRepo.checkBlocked(
      blockedUserFound.id,
      blockerFound.id,
    );
    if (isBlockedByTarget) {
      throw new NotFoundException(
        sendResponse(
          HttpStatus.NOT_FOUND,
          message.block.post_block.user_not_found,
          undefined,
          errorCode.block.post_block.user_not_found,
        ),
      );
    }

    // avoid duplicate block
    const isBlocked = await this.blockRepo.checkBlocked(
      blockerFound.id,
      blockedUserFound.id,
    );
    if (isBlocked) {
      throw new BadRequestException(
        sendResponse(
          HttpStatus.BAD_REQUEST,
          message.block.post_block.already_blocked,
          undefined,
          errorCode.block.post_block.already_blocked,
        ),
      );
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
        throw new BadRequestException(
          sendResponse(
            HttpStatus.BAD_REQUEST,
            message.block.post_block.already_blocked,
            undefined,
            errorCode.block.post_block.already_blocked,
          ),
        );
      }
      throw err;
    }

    // return success response
    return sendResponse(HttpStatus.OK, message.block.post_block.success);
  }

  async unblock(currentUser: AuthUser, blockedUsername: string) {
    // prevent unblocking self
    if (currentUser.username === blockedUsername) {
      throw new BadRequestException(
        sendResponse(
          HttpStatus.BAD_REQUEST,
          message.block.delete_block.cant_self_unblock,
          undefined,
          errorCode.block.delete_block.cant_self_unblock,
        ),
      );
    }

    // ensure target user exists
    const blockedUserFound =
      await this.blockRepo.findUserByUsername(blockedUsername);
    if (!blockedUserFound) {
      throw new NotFoundException(
        sendResponse(
          HttpStatus.NOT_FOUND,
          message.block.delete_block.user_not_found,
          undefined,
          errorCode.block.delete_block.user_not_found,
        ),
      );
    }

    // hide existence if current user is blocked by target user
    const isBlockedByTarget = await this.blockRepo.checkBlocked(
      blockedUserFound.id,
      currentUser.sub,
    );
    if (isBlockedByTarget) {
      throw new NotFoundException(
        sendResponse(
          HttpStatus.NOT_FOUND,
          message.block.delete_block.user_not_found,
          undefined,
          errorCode.block.delete_block.user_not_found,
        ),
      );
    }

    // ensure block exists
    const isBlocked = await this.blockRepo.checkBlocked(
      currentUser.sub,
      blockedUserFound.id,
    );
    if (!isBlocked) {
      throw new BadRequestException(
        sendResponse(
          HttpStatus.BAD_REQUEST,
          message.block.delete_block.not_blocked,
          undefined,
          errorCode.block.delete_block.not_blocked,
        ),
      );
    }

    // delete block record
    await this.blockRepo.deleteBlock(currentUser.sub, blockedUserFound.id);

    // return success response
    return sendResponse(HttpStatus.OK, message.block.delete_block.success);
  }

  async getBlockedList(currentUser: AuthUser, key?: string, cursor?: string) {
    // ensure current user exists
    const blockerFound = await this.blockRepo.findUserById(currentUser.sub);
    if (!blockerFound) {
      throw new NotFoundException(
        sendResponse(
          HttpStatus.NOT_FOUND,
          message.block.get_blocked_list.user_not_found,
          undefined,
          errorCode.block.get_blocked_list.user_not_found,
        ),
      );
    }

    // verify and decode cursor if provided
    let cursorDecoded: Cursor | undefined;
    if (cursor) {
      try {
        cursorDecoded = await this.jwtService.verifyAsync<Cursor>(cursor);
      } catch {
        throw new BadRequestException(
          sendResponse(
            HttpStatus.BAD_REQUEST,
            message.block.get_blocked_list.cursor_invalid,
            undefined,
            errorCode.block.get_blocked_list.cursor_invalid,
          ),
        );
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
      return sendResponse(
        HttpStatus.OK,
        message.block.get_blocked_list.success,
        { blockedList: [], cursor: null },
      );
    }

    // map response data
    const blockedList = blockedListRaw.map((block) => ({
      blockedUser: this.mapBlockedUser(block.blockedUser),
      createdAt: block.createdAt,
    }));

    // sign next cursor
    const cursorPayload: Cursor = { id: blockedFinal.id };
    const cursorToken = await this.jwtService.signAsync(cursorPayload);

    return sendResponse(HttpStatus.OK, message.block.get_blocked_list.success, {
      blockedList: blockedList,
      cursor: cursorToken,
    });
  }

  async getBlockStatus(currentUser: AuthUser, targetUsername: string) {
    // prevent checking self
    if (currentUser.username === targetUsername) {
      throw new BadRequestException(
        sendResponse(
          HttpStatus.BAD_REQUEST,
          message.block.get_block_status.cant_self_check,
          undefined,
          errorCode.block.get_block_status.cant_self_check,
        ),
      );
    }

    // ensure target user exists
    const targetUserFound =
      await this.blockRepo.findUserByUsername(targetUsername);
    if (!targetUserFound) {
      throw new NotFoundException(
        sendResponse(
          HttpStatus.NOT_FOUND,
          message.block.get_block_status.user_not_found,
          undefined,
          errorCode.block.get_block_status.user_not_found,
        ),
      );
    }

    // hide existence if current user is blocked by target user
    const isBlockedByTarget = await this.blockRepo.checkBlocked(
      targetUserFound.id,
      currentUser.sub,
    );
    if (isBlockedByTarget) {
      throw new NotFoundException(
        sendResponse(
          HttpStatus.NOT_FOUND,
          message.block.get_block_status.user_not_found,
          undefined,
          errorCode.block.get_block_status.user_not_found,
        ),
      );
    }

    // check block status
    const isBlocked = await this.blockRepo.checkBlocked(
      currentUser.sub,
      targetUserFound.id,
    );

    return sendResponse(HttpStatus.OK, message.block.get_block_status.success, {
      isBlocked: isBlocked,
    });
  }
  async getBlockedUserCount(currentUserId: number) {
    const blockedUserCount =
      await this.blockRepo.getBlockedUserCount(currentUserId);
    return sendResponse(
      HttpStatus.OK,
      message.block.get_blocked_user_count.success,
      blockedUserCount,
    );
  }
}
