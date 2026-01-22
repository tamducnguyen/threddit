import {
  BadRequestException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FollowRepository } from './follow.repository';
import { message } from '../common/helper/message.helper';
import { sendResponse } from '../common/helper/response.helper';
import { errorCode } from '../common/helper/errorcode.helper';
import { JwtService } from '@nestjs/jwt';
import { Cursor } from '../interface/cursor.interface';
import { FollowEntity } from '../entities/follow.entity';
import {
  JobNotificationQueue,
  NameNotificationQueue,
} from '../notification/helper/notification.helper';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { AuthUser } from '../token/authuser.interface';
import { ConvertMediaRelativePathToUrl } from '../common/helper/media-url.helper';

@Injectable()
export class FollowService {
  constructor(
    private readonly followRepo: FollowRepository,
    private readonly jwtService: JwtService,
    @InjectQueue(NameNotificationQueue)
    private readonly notificationQueue: Queue,
    private readonly configService: ConfigService,
  ) {}
  private mapFollowerUser(user: {
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
   * get user's follow number
   * @param username
   * @returns
   */
  async getFollowNumber(
    currentUser: AuthUser,
    getFollowNumberUsername?: string,
  ) {
    let userId = currentUser.sub;
    if (getFollowNumberUsername) {
      //check if user not exist
      const getFollowNumberUserFound = await this.followRepo.findUserByUsername(
        getFollowNumberUsername,
      );
      if (!getFollowNumberUserFound) {
        throw new NotFoundException(
          sendResponse(
            HttpStatus.NOT_FOUND,
            message.follow.get_follow_number.user_not_found,
            undefined,
            errorCode.follow.get_follow_number.user_not_found,
          ),
        );
      }
      //check if current user is blocked by whose username
      const isBlocked = await this.followRepo.checkBlocked(
        currentUser.sub,
        getFollowNumberUserFound.id,
      );
      if (isBlocked) {
        throw new NotFoundException(
          sendResponse(
            HttpStatus.NOT_FOUND,
            message.follow.get_follow_number.user_not_found,
            undefined,
            errorCode.follow.get_follow_number.user_not_found,
          ),
        );
      }
      userId = getFollowNumberUserFound.id;
    }
    //get follow numbers
    const followingNumber = await this.followRepo.countFollowing(userId);
    const followerNumber = await this.followRepo.countFollower(userId);
    //send response
    const data = { followerNumber, followingNumber };
    return sendResponse(
      HttpStatus.OK,
      message.follow.get_follow_number.success,
      data,
    );
  }
  /**
   * get user's follower list
   * @param username
   * @param currentUserId
   * @param cursor
   * @returns
   */
  async getFollowers(username: string, currentUserId: number, cursor?: string) {
    //check if user exist
    const userFound = await this.followRepo.findUserByUsername(username);
    if (!userFound) {
      throw new NotFoundException(
        sendResponse(
          HttpStatus.NOT_FOUND,
          message.follow.get_follower_list.user_not_found,
          undefined,
          errorCode.follow.get_follower_list.user_not_found,
        ),
      );
    }
    //check if current user is blocked by whose username
    const isBlocked = await this.followRepo.checkBlocked(
      currentUserId,
      userFound.id,
    );
    if (isBlocked) {
      throw new NotFoundException(
        sendResponse(
          HttpStatus.NOT_FOUND,
          message.follow.get_follower_list.user_not_found,
          undefined,
          errorCode.follow.get_follower_list.user_not_found,
        ),
      );
    }
    //check if there is cursor -> verify cursor
    let cursorDecoded: Cursor | undefined;
    if (cursor) {
      try {
        cursorDecoded = await this.jwtService.verifyAsync<Cursor>(cursor);
      } catch {
        throw new BadRequestException(
          sendResponse(
            HttpStatus.BAD_REQUEST,
            message.follow.get_follower_list.cursor_invalid,
            undefined,
            errorCode.follow.get_follower_list.cursor_invalid,
          ),
        );
      }
    } else {
      cursorDecoded = undefined;
    }
    //get followers
    const followerListRaw = await this.followRepo.findFollowers(
      userFound.id,
      currentUserId,
      cursorDecoded,
    );
    //check if has follower
    const followerFinal = followerListRaw[followerListRaw.length - 1];
    if (!followerFinal) {
      return sendResponse(
        HttpStatus.OK,
        message.follow.get_follower_list.success,
        { followerList: [], cursor: null },
      );
    }
    //mapping data
    const followerList = followerListRaw.map((map) => {
      const follower = this.mapFollowerUser(map.follower);
      if (map.follower.id == currentUserId) {
        return {
          follower: follower,
          createdAt: map.createdAt,
        };
      }
      return {
        follower: follower,
        createdAt: map.createdAt,
        canFollow: map.canFollow,
      };
    });
    //sign cursor
    const cursorPayload: Cursor = {
      id: followerFinal.id,
    };
    const cursorToken = await this.jwtService.signAsync(cursorPayload);
    //send response
    const data = { followerList: followerList, cursor: cursorToken };
    return sendResponse(
      HttpStatus.OK,
      message.follow.get_follower_list.success,
      data,
    );
  }
  /**
   * get user's following list
   * @param username
   * @param currentUserId
   * @param cursor
   * @returns
   */
  async getFollowings(
    username: string,
    currentUserId: number,
    cursor?: string,
  ) {
    //check if user exist
    const userFound = await this.followRepo.findUserByUsername(username);
    if (!userFound) {
      throw new NotFoundException(
        sendResponse(
          HttpStatus.NOT_FOUND,
          message.follow.get_following_list.user_not_found,
          undefined,
          errorCode.follow.get_following_list.user_not_found,
        ),
      );
    }
    //check if current user is blocked by whose username
    const isBlocked = await this.followRepo.checkBlocked(
      currentUserId,
      userFound.id,
    );
    if (isBlocked) {
      throw new NotFoundException(
        sendResponse(
          HttpStatus.NOT_FOUND,
          message.follow.get_following_list.user_not_found,
          undefined,
          errorCode.follow.get_following_list.user_not_found,
        ),
      );
    }
    //check if has cursor -> verify cursor
    let cursorDecoded: Cursor | undefined;
    if (cursor) {
      try {
        cursorDecoded = await this.jwtService.verifyAsync<Cursor>(cursor);
      } catch {
        throw new BadRequestException(
          sendResponse(
            HttpStatus.BAD_REQUEST,
            message.follow.get_following_list.cursor_invalid,
            undefined,
            errorCode.follow.get_following_list.cursor_invalid,
          ),
        );
      }
    } else {
      cursorDecoded = undefined;
    }
    //get following
    const followingListRaw = await this.followRepo.findFollowings(
      userFound,
      currentUserId,
      cursorDecoded,
    );
    //check if has following
    const followingFinal = followingListRaw[followingListRaw.length - 1];
    if (!followingFinal) {
      return sendResponse(
        HttpStatus.OK,
        message.follow.get_following_list.success,
        { followingList: [], cursor: null },
      );
    }
    //mapping data
    const followingList = followingListRaw.map((map) => {
      const followee = this.mapFollowerUser(map.followee);
      if (map.followee.id == currentUserId) {
        return {
          followee: followee,
          createdAt: map.createdAt,
        };
      }
      return {
        followee: followee,
        createdAt: map.createdAt,
        canFollow: map.canFollow,
      };
    });
    //sign cursor
    const cursorPayload: Cursor = {
      id: followingFinal.id,
    };
    const cursorToken = await this.jwtService.signAsync(cursorPayload);
    //send response
    const data = { followingList: followingList, cursor: cursorToken };
    return sendResponse(
      HttpStatus.OK,
      message.follow.get_following_list.success,
      data,
    );
  }
  /**
   * search followers by key
   * @param username
   * @param searchUserDTO
   * @param cursor
   * @returns
   */
  async searchFollowersByKey(
    username: string,
    currentUserId: number,
    key: string,
    cursor?: string,
  ) {
    //check if user exist
    const userFound = await this.followRepo.findUserByUsername(username);
    if (!userFound) {
      throw new NotFoundException(
        sendResponse(
          HttpStatus.NOT_FOUND,
          message.follow.get_follower_list.user_not_found,
          undefined,
          errorCode.follow.get_follower_list.user_not_found,
        ),
      );
    }
    //check if current user is blocked by whose username
    const isBlocked = await this.followRepo.checkBlocked(
      currentUserId,
      userFound.id,
    );
    if (isBlocked) {
      throw new NotFoundException(
        sendResponse(
          HttpStatus.NOT_FOUND,
          message.follow.get_follower_list.user_not_found,
          undefined,
          errorCode.follow.get_follower_list.user_not_found,
        ),
      );
    }
    //check if has cursor -> verify cursor
    let cursorDecoded: Cursor | undefined;
    if (cursor) {
      try {
        cursorDecoded = await this.jwtService.verifyAsync<Cursor>(cursor);
      } catch {
        throw new BadRequestException(
          sendResponse(
            HttpStatus.BAD_REQUEST,
            message.follow.get_follower_list.cursor_invalid,
            undefined,
            errorCode.follow.get_follower_list.cursor_invalid,
          ),
        );
      }
    } else {
      cursorDecoded = undefined;
    }
    //get followers by key
    const followerListRaw = await this.followRepo.findFollowersByKey(
      userFound,
      currentUserId,
      key,
      cursorDecoded,
    );
    //check if has follower
    const followerFinal = followerListRaw[followerListRaw.length - 1];
    if (!followerFinal) {
      return sendResponse(
        HttpStatus.OK,
        message.follow.get_follower_list.success,
        { followerList: [], cursor: null },
      );
    }
    //mapping data
    const followerList = followerListRaw.map((follow) => {
      const follower = this.mapFollowerUser(follow.follower);
      if (follow.follower.id == currentUserId) {
        return {
          follower: follower,
          createdAt: follow.createdAt,
        };
      }
      return {
        follower: follower,
        createdAt: follow.createdAt,
        canFollow: follow.canFollow,
      };
    });
    //sign cursor
    const cursorPayload: Cursor = {
      id: followerFinal.id,
    };
    const cursorToken = await this.jwtService.signAsync(cursorPayload);
    //send response
    const data = { followerList: followerList, cursor: cursorToken };
    return sendResponse(
      HttpStatus.OK,
      message.follow.get_follower_list.success,
      data,
    );
  }
  /**
   * search followings by key
   * @param username
   * @param key
   * @param cursor
   * @returns
   */
  async searchFollowingsByKey(
    username: string,
    currentUserId: number,
    key: string,
    cursor?: string,
  ) {
    //check if user exist
    const userFound = await this.followRepo.findUserByUsername(username);
    if (!userFound) {
      throw new NotFoundException(
        sendResponse(
          HttpStatus.NOT_FOUND,
          message.follow.get_following_list.user_not_found,
          undefined,
          errorCode.follow.get_following_list.user_not_found,
        ),
      );
    }
    //check if current user is blocked by whose username
    const isBlocked = await this.followRepo.checkBlocked(
      currentUserId,
      userFound.id,
    );
    if (isBlocked) {
      throw new NotFoundException(
        sendResponse(
          HttpStatus.NOT_FOUND,
          message.follow.get_following_list.user_not_found,
          undefined,
          errorCode.follow.get_following_list.user_not_found,
        ),
      );
    }
    //check if has cursor -> verify cursor
    let cursorDecoded: Cursor | undefined;
    if (cursor) {
      try {
        cursorDecoded = await this.jwtService.verifyAsync<Cursor>(cursor);
      } catch {
        throw new BadRequestException(
          sendResponse(
            HttpStatus.BAD_REQUEST,
            message.follow.get_following_list.cursor_invalid,
            undefined,
            errorCode.follow.get_following_list.cursor_invalid,
          ),
        );
      }
    } else {
      cursorDecoded = undefined;
    }
    //get followings by key
    const followingListRaw = await this.followRepo.findFollowingsByKey(
      userFound,
      currentUserId,
      key,
      cursorDecoded,
    );
    //check if has following
    const followingFinal = followingListRaw[followingListRaw.length - 1];
    if (!followingFinal) {
      return sendResponse(
        HttpStatus.OK,
        message.follow.get_following_list.success,
        { followingList: [], cursor: null },
      );
    }
    //mapping data
    const followingList = followingListRaw.map((follow) => {
      const followee = this.mapFollowerUser(follow.followee);
      if (follow.followee.id == currentUserId) {
        return {
          followee: followee,
          createdAt: follow.createdAt,
        };
      }
      return {
        followee: followee,
        createdAt: follow.createdAt,
        canFollow: follow.canFollow,
      };
    });
    //sign cursor
    const cursorPayload: Cursor = {
      id: followingFinal.id,
    };
    const cursorToken = await this.jwtService.signAsync(cursorPayload);
    //send response
    const data = { followingList: followingList, cursor: cursorToken };
    return sendResponse(
      HttpStatus.OK,
      message.follow.get_following_list.success,
      data,
    );
  }
  /**
   * follow user
   * @param currentUsername
   * @param followeeUsername
   * @returns
   */
  async postFollow(currentUsername: string, followeeUsername: string) {
    //check if current user self follow
    if (followeeUsername === currentUsername) {
      throw new BadRequestException(
        sendResponse(
          HttpStatus.BAD_REQUEST,
          message.follow.post_follow.cant_self_follow,
          undefined,
          errorCode.follow.post_follow.cant_self_follow,
        ),
      );
    }
    //check if current and followee user exist
    const currentUserFound =
      await this.followRepo.findUserByUsername(currentUsername);
    const followeeUserFound =
      await this.followRepo.findUserByUsername(followeeUsername);
    if (!currentUserFound || !followeeUserFound) {
      throw new NotFoundException(
        sendResponse(
          HttpStatus.NOT_FOUND,
          message.follow.post_follow.user_not_found,
          undefined,
          errorCode.follow.post_follow.user_not_found,
        ),
      );
    }
    //check if current user is blocked by whose username
    const isBlocked = await this.followRepo.checkBlocked(
      currentUserFound.id,
      followeeUserFound.id,
    );
    if (isBlocked) {
      throw new NotFoundException(
        sendResponse(
          HttpStatus.NOT_FOUND,
          message.follow.post_follow.user_not_found,
          undefined,
          errorCode.follow.post_follow.user_not_found,
        ),
      );
    }
    //check if current user block user
    const isFolloweeBlocked = await this.followRepo.checkBlocked(
      followeeUserFound.id,
      currentUserFound.id,
    );
    if (isFolloweeBlocked) {
      throw new BadRequestException(
        sendResponse(
          HttpStatus.BAD_REQUEST,
          message.follow.post_follow.followee_blocked,
          undefined,
          errorCode.follow.post_follow.followee_blocked,
        ),
      );
    }
    //check if current user already follow followee user
    const isFollowed = await this.followRepo.checkExistFollow(
      currentUserFound.id,
      followeeUserFound.id,
    );
    if (isFollowed) {
      throw new BadRequestException(
        sendResponse(
          HttpStatus.BAD_REQUEST,
          message.follow.post_follow.follow_already,
          undefined,
          errorCode.follow.post_follow.follow_already,
        ),
      );
    }
    //store into db
    const followEntity: Partial<FollowEntity> = {
      follower: currentUserFound,
      followee: followeeUserFound,
    };
    await this.followRepo.postFollow(followEntity);
    //notify
    await this.notificationQueue.add(
      JobNotificationQueue.FOLLOW,
      {
        currentUser: currentUserFound,
        followee: followeeUserFound,
      },
      { priority: 1 },
    );
    return sendResponse(HttpStatus.OK, message.follow.post_follow.success);
  }
  /**
   * unfollow user
   * @param currentUsername
   * @param followeeUsername
   * @returns
   */
  async deleteFollow(currentUsername: string, followeeUsername: string) {
    //check if current and followee user exist
    const currentUserFound =
      await this.followRepo.findUserByUsername(currentUsername);
    const followeeUserFound =
      await this.followRepo.findUserByUsername(followeeUsername);
    if (!currentUserFound || !followeeUserFound) {
      throw new NotFoundException(
        sendResponse(
          HttpStatus.NOT_FOUND,
          message.follow.delete_follow.user_not_found,
          undefined,
          errorCode.follow.delete_follow.user_not_found,
        ),
      );
    }
    //check if current user already follow followee user
    const isFollowed = await this.followRepo.checkExistFollow(
      currentUserFound.id,
      followeeUserFound.id,
    );
    if (!isFollowed) {
      throw new BadRequestException(
        sendResponse(
          HttpStatus.BAD_REQUEST,
          message.follow.delete_follow.follow_not_found,
          undefined,
          errorCode.follow.delete_follow.follow_not_found,
        ),
      );
    }
    //delete and send response
    const followEntity: Partial<FollowEntity> = {
      follower: currentUserFound,
      followee: followeeUserFound,
    };
    await this.followRepo.deleteFollow(followEntity);
    return sendResponse(HttpStatus.OK, message.follow.delete_follow.success);
  }
  /**
   * get follow state
   * @param currentUsername
   * @param getStateUsername
   * @returns
   */
  async getFollowState(currentUser: AuthUser, getStateUsername: string) {
    //check if user not exist
    const getStateUserFound =
      await this.followRepo.findUserByUsername(getStateUsername);
    if (!getStateUserFound) {
      throw new NotFoundException(
        sendResponse(
          HttpStatus.NOT_FOUND,
          message.follow.get_follow_state.user_not_found,
          undefined,
          errorCode.follow.get_follow_state.user_not_found,
        ),
      );
    }
    //check if current user self-check
    if (currentUser.sub === getStateUserFound.id) {
      throw new BadRequestException(
        sendResponse(
          HttpStatus.BAD_REQUEST,
          message.follow.get_follow_state.can_not_self_check,
        ),
      );
    }
    //check if current user is blocked by whose username
    const isBlocked = await this.followRepo.checkBlocked(
      currentUser.sub,
      getStateUserFound.id,
    );
    if (isBlocked) {
      throw new NotFoundException(
        sendResponse(
          HttpStatus.NOT_FOUND,
          message.follow.get_follow_state.user_not_found,
          undefined,
          errorCode.follow.get_follow_state.user_not_found,
        ),
      );
    }
    //get user's follow state
    const isFollowing = await this.followRepo.checkExistFollow(
      currentUser.sub,
      getStateUserFound.id,
    );
    //send response
    const data = {
      isFollowing: isFollowing,
    };
    return sendResponse(
      HttpStatus.OK,
      message.follow.get_follow_state.sucess,
      data,
    );
  }
}
