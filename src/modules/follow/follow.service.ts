import { Injectable } from '@nestjs/common';
import {
  FollowDeleteFollowFollowNotFoundException,
  FollowDeleteFollowUserNotFoundException,
  FollowGetFollowNumberUserNotFoundException,
  FollowGetFollowStateCanNotSelfCheckException,
  FollowGetFollowStateUserNotFoundException,
  FollowGetFollowerListCursorInvalidException,
  FollowGetFollowerListUserNotFoundException,
  FollowGetFollowingListCursorInvalidException,
  FollowGetFollowingListUserNotFoundException,
  FollowPostFollowCantSelfFollowException,
  FollowPostFollowFollowAlreadyException,
  FollowPostFollowUserNotFoundException,
} from '../../common/exception';
import { FollowRepository } from './follow.repository';
import { JwtService } from '@nestjs/jwt';
import { Cursor } from '../../common/interface/cursor.interface';
import { FollowEntity } from '../../entities/follow.entity';
import {
  JobNotificationQueue,
  NameNotificationQueue,
} from '../notification/helper/notification.helper';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { AuthUser } from '../token/authuser.interface';
import { ConvertMediaRelativePathToUrl } from '../../common/helper/media-url.helper';
import { BlockService } from '../block/block.service';

@Injectable()
export class FollowService {
  constructor(
    private readonly followRepo: FollowRepository,
    private readonly jwtService: JwtService,
    @InjectQueue(NameNotificationQueue)
    private readonly notificationQueue: Queue,
    private readonly configService: ConfigService,
    private readonly blockService: BlockService,
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
        throw new FollowGetFollowNumberUserNotFoundException();
      }
      //check block relationship in both directions
      await this.blockService.validateBlock(
        currentUser.sub,
        getFollowNumberUserFound.id,
      );
      userId = getFollowNumberUserFound.id;
    }
    //get follow numbers
    const followingNumber = await this.followRepo.countFollowing(userId);
    const followerNumber = await this.followRepo.countFollower(userId);
    //send response
    const data = { followerNumber, followingNumber };
    return { kind: 'success', data: data };
  }
  /**
   * get user's follower list
   * @param username
   * @param currentUserId
   * @param cursor
   * @returns
   */
  async getFollowers(
    username: string | undefined,
    currentUserId: number,
    cursor?: string,
  ) {
    //check if user exist (no username means the current user's own list)
    const userFound = username
      ? await this.followRepo.findUserByUsername(username)
      : await this.followRepo.findUserById(currentUserId);
    if (!userFound) {
      throw new FollowGetFollowerListUserNotFoundException();
    }
    // check block relationship in both directions
    await this.blockService.validateBlock(currentUserId, userFound.id);
    //check if there is cursor -> verify cursor
    let cursorDecoded: Cursor | undefined;
    if (cursor) {
      try {
        cursorDecoded = await this.jwtService.verifyAsync<Cursor>(cursor);
      } catch {
        throw new FollowGetFollowerListCursorInvalidException();
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
      return { kind: 'success', data: { followerList: [], cursor: null } };
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
    return { kind: 'success', data: data };
  }
  /**
   * get user's following list
   * @param username
   * @param currentUserId
   * @param cursor
   * @returns
   */
  async getFollowings(
    username: string | undefined,
    currentUserId: number,
    cursor?: string,
  ) {
    //check if user exist (no username means the current user's own list)
    const userFound = username
      ? await this.followRepo.findUserByUsername(username)
      : await this.followRepo.findUserById(currentUserId);
    if (!userFound) {
      throw new FollowGetFollowingListUserNotFoundException();
    }
    // check block relationship in both directions
    await this.blockService.validateBlock(currentUserId, userFound.id);
    //check if has cursor -> verify cursor
    let cursorDecoded: Cursor | undefined;
    if (cursor) {
      try {
        cursorDecoded = await this.jwtService.verifyAsync<Cursor>(cursor);
      } catch {
        throw new FollowGetFollowingListCursorInvalidException();
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
      return { kind: 'success', data: { followingList: [], cursor: null } };
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
    return { kind: 'success', data: data };
  }
  /**
   * search followers by key
   * @param username
   * @param searchUserDTO
   * @param cursor
   * @returns
   */
  async searchFollowersByKey(
    username: string | undefined,
    currentUserId: number,
    key: string,
    cursor?: string,
  ) {
    //check if user exist (no username means the current user's own list)
    const userFound = username
      ? await this.followRepo.findUserByUsername(username)
      : await this.followRepo.findUserById(currentUserId);
    if (!userFound) {
      throw new FollowGetFollowerListUserNotFoundException();
    }
    // check block relationship in both directions
    await this.blockService.validateBlock(currentUserId, userFound.id);
    //check if has cursor -> verify cursor
    let cursorDecoded: Cursor | undefined;
    if (cursor) {
      try {
        cursorDecoded = await this.jwtService.verifyAsync<Cursor>(cursor);
      } catch {
        throw new FollowGetFollowerListCursorInvalidException();
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
      return { kind: 'success', data: { followerList: [], cursor: null } };
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
    return { kind: 'success', data: data };
  }
  /**
   * search followings by key
   * @param username
   * @param key
   * @param cursor
   * @returns
   */
  async searchFollowingsByKey(
    username: string | undefined,
    currentUserId: number,
    key: string,
    cursor?: string,
  ) {
    //check if user exist (no username means the current user's own list)
    const userFound = username
      ? await this.followRepo.findUserByUsername(username)
      : await this.followRepo.findUserById(currentUserId);
    if (!userFound) {
      throw new FollowGetFollowingListUserNotFoundException();
    }
    // check block relationship in both directions
    await this.blockService.validateBlock(currentUserId, userFound.id);
    //check if has cursor -> verify cursor
    let cursorDecoded: Cursor | undefined;
    if (cursor) {
      try {
        cursorDecoded = await this.jwtService.verifyAsync<Cursor>(cursor);
      } catch {
        throw new FollowGetFollowingListCursorInvalidException();
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
      return { kind: 'success', data: { followingList: [], cursor: null } };
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
    return { kind: 'success', data: data };
  }
  /**
   * follow user
   * @param currentUsername
   * @param followeeUsername
   * @returns
   */
  async postFollow(currentUser: AuthUser, followeeUsername: string) {
    //check if current and followee user exist
    const currentUserFound = await this.followRepo.findUserById(
      currentUser.sub,
    );
    const followeeUserFound =
      await this.followRepo.findUserByUsername(followeeUsername);
    if (!currentUserFound || !followeeUserFound) {
      throw new FollowPostFollowUserNotFoundException();
    }
    //check if current user self follow
    if (currentUserFound.id === followeeUserFound.id) {
      throw new FollowPostFollowCantSelfFollowException();
    }
    console.log('run to this');
    // check block relationship in both directions
    await this.blockService.validateBlock(
      currentUserFound.id,
      followeeUserFound.id,
    );
    //check if current user already follow followee user
    const isFollowed = await this.followRepo.checkExistFollow(
      currentUserFound.id,
      followeeUserFound.id,
    );
    if (isFollowed) {
      throw new FollowPostFollowFollowAlreadyException();
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
    return { kind: 'success' };
  }
  /**
   * unfollow user
   * @param currentUsername
   * @param followeeUsername
   * @returns
   */
  async deleteFollow(currentUser: AuthUser, followeeUsername: string) {
    //check if current and followee user exist
    const currentUserFound = await this.followRepo.findUserById(
      currentUser.sub,
    );
    const followeeUserFound =
      await this.followRepo.findUserByUsername(followeeUsername);
    if (!currentUserFound || !followeeUserFound) {
      throw new FollowDeleteFollowUserNotFoundException();
    }
    //check if current user already follow followee user
    const isFollowed = await this.followRepo.checkExistFollow(
      currentUserFound.id,
      followeeUserFound.id,
    );
    if (!isFollowed) {
      throw new FollowDeleteFollowFollowNotFoundException();
    }
    //delete and send response
    const followEntity: Partial<FollowEntity> = {
      follower: currentUserFound,
      followee: followeeUserFound,
    };
    await this.followRepo.deleteFollow(followEntity);
    return { kind: 'success' };
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
      throw new FollowGetFollowStateUserNotFoundException();
    }
    //check if current user self-check
    if (currentUser.sub === getStateUserFound.id) {
      throw new FollowGetFollowStateCanNotSelfCheckException();
    }
    // check block relationship in both directions
    await this.blockService.validateBlock(
      currentUser.sub,
      getStateUserFound.id,
    );
    //get user's follow state
    const isFollowing = await this.followRepo.checkExistFollow(
      currentUser.sub,
      getStateUserFound.id,
    );
    //send response
    const data = {
      isFollowing: isFollowing,
    };
    return { kind: 'sucess', data: data };
  }
}
