import {
  BadRequestException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FollowRepository } from './follow.repository';
import { message } from '../common/helper/message.helper';
import { sendResponse } from '../common/helper/response.helper';
import { JwtService } from '@nestjs/jwt';
import { Cursor } from '../interface/cursor.interface';
import { FollowEntity } from '../entities/follow.entity';
import {
  JobNotificationQueue,
  NameNotificationQueue,
} from '../common/helper/notification.helper';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
@Injectable()
export class FollowService {
  constructor(
    private readonly followRepo: FollowRepository,
    private readonly jwtService: JwtService,
    @InjectQueue(NameNotificationQueue)
    private readonly notificationQueue: Queue,
  ) {}
  /**
   * get user's follow number
   * @param username
   * @returns
   */
  async getFollowNumber(username: string) {
    //check if user not exist
    const userFound = await this.followRepo.findUserByUsername(username);
    if (!userFound) {
      throw new NotFoundException(
        message.follow.get_follow_number.user_not_found,
      );
    }
    //get follow numbers
    const followingNumber = await this.followRepo.countFollowing(userFound);
    const followerNumber = await this.followRepo.countFollower(userFound);
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
  async getFollowers(username: string, currentUserId: string, cursor?: string) {
    //check if user exist
    const userFound = await this.followRepo.findUserByUsername(username);
    if (!userFound) {
      throw new NotFoundException(
        message.follow.get_follower_list.user_not_found,
      );
    }
    //check if there is cursor -> verify cursor
    let cursorDecoded: Cursor | undefined;
    if (cursor) {
      try {
        cursorDecoded = await this.jwtService.verifyAsync<Cursor>(cursor);
      } catch {
        throw new BadRequestException(
          message.follow.get_follower_list.cursor_invalid,
        );
      }
    } else {
      cursorDecoded = undefined;
    }
    //get followers
    const followerListRaw = await this.followRepo.findFollowers(
      userFound,
      currentUserId,
      cursorDecoded,
    );
    //check if has follower
    const followerFinal = followerListRaw[followerListRaw.length - 1];
    if (!followerFinal) {
      return sendResponse(
        HttpStatus.NO_CONTENT,
        message.follow.get_follower_list.no_content,
      );
    }
    //mapping data
    const followerList = followerListRaw.map((map) => {
      if (map.follower.id == currentUserId) {
        return {
          follower: map.follower,
          createdAt: map.createdAt,
        };
      }
      return {
        follower: map.follower,
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
    currentUserId: string,
    cursor?: string,
  ) {
    //check if user exist
    const userFound = await this.followRepo.findUserByUsername(username);
    if (!userFound) {
      throw new NotFoundException(
        message.follow.get_following_list.user_not_found,
      );
    }
    //check if has cursor -> verify cursor
    let cursorDecoded: Cursor | undefined;
    if (cursor) {
      try {
        cursorDecoded = await this.jwtService.verifyAsync<Cursor>(cursor);
      } catch {
        throw new BadRequestException(
          message.follow.get_following_list.cursor_invalid,
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
        HttpStatus.NO_CONTENT,
        message.follow.get_following_list.no_content,
      );
    }
    //mapping data
    const followingList = followingListRaw.map((map) => {
      if (map.followee.id == currentUserId) {
        return {
          followee: map.followee,
          createdAt: map.createdAt,
        };
      }
      return {
        followee: map.followee,
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
   * follow user
   * @param currentUsername
   * @param followeeUsername
   * @returns
   */
  async postFollow(currentUsername: string, followeeUsername: string) {
    //check if current user self follow
    if (followeeUsername === currentUsername) {
      throw new BadRequestException(
        message.follow.post_follow.cant_self_follow,
      );
    }
    //check if current and followee user exist
    const currentUserFound =
      await this.followRepo.findUserByUsername(currentUsername);
    const followeeUserFound =
      await this.followRepo.findUserByUsername(followeeUsername);
    if (!currentUserFound || !followeeUserFound) {
      throw new NotFoundException(message.follow.post_follow.user_not_found);
    }
    //check if current user already follow followee user
    const isFollowed = await this.followRepo.checkExistFollow(
      currentUserFound,
      followeeUserFound,
    );
    if (isFollowed) {
      throw new BadRequestException(message.follow.post_follow.follow_already);
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
      throw new NotFoundException(message.follow.delete_follow.user_not_found);
    }
    //check if current user already follow followee user
    const isFollowed = await this.followRepo.checkExistFollow(
      currentUserFound,
      followeeUserFound,
    );
    if (!isFollowed) {
      throw new BadRequestException(
        message.follow.delete_follow.follow_not_found,
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
  async getFollowState(currentUsername: string, getStateUsername: string) {
    //check if users not exist
    const userFound = await this.followRepo.findUserByUsername(currentUsername);
    const getStateUserFound =
      await this.followRepo.findUserByUsername(getStateUsername);
    if (!userFound || !getStateUserFound) {
      throw new NotFoundException(
        message.follow.get_follow_state.user_not_found,
      );
    }
    //get user's follow state
    const isFollow = await this.followRepo.checkExistFollow(
      userFound,
      getStateUserFound,
    );
    //send response
    const data = {
      username: getStateUserFound.username,
      email: getStateUserFound.email,
      isFollow: isFollow,
    };
    return sendResponse(
      HttpStatus.OK,
      message.follow.get_follow_state.sucess,
      data,
    );
  }
}
