import { Injectable } from '@nestjs/common';
import {
  FriendshipAcceptRequestRequestNotFoundException,
  FriendshipCancelRequestRequestNotFoundException,
  FriendshipGetFriendListCursorInvalidException,
  FriendshipGetFriendListTargetUserBlockException,
  FriendshipGetFriendListUserNotFoundException,
  FriendshipGetFriendStatusCantSelfCheckException,
  FriendshipGetFriendStatusTargetUserBlockException,
  FriendshipGetFriendStatusUserNotFoundException,
  FriendshipGetMutualFriendCountCantSelfGetException,
  FriendshipGetMutualFriendCountTargetUserBlockException,
  FriendshipGetMutualFriendCountUserNotFoundException,
  FriendshipGetMutualFriendListCantSelfGetException,
  FriendshipGetMutualFriendListCursorInvalidException,
  FriendshipGetMutualFriendListTargetUserBlockException,
  FriendshipGetMutualFriendListUserNotFoundException,
  FriendshipGetReceivedRequestsCursorInvalidException,
  FriendshipGetSentRequestsCursorInvalidException,
  FriendshipGetUserFriendCountTargetUserBlockException,
  FriendshipGetUserFriendCountUserNotFoundException,
  FriendshipRejectRequestRequestNotFoundException,
  FriendshipSendRequestCantSelfRequestException,
  FriendshipSendRequestFriendshipExistsException,
  FriendshipSendRequestRecipientBlockedException,
  FriendshipSendRequestRequestAlreadySentException,
  FriendshipSendRequestUserNotFoundException,
  FriendshipUnfriendCantSelfUnfriendException,
  FriendshipUnfriendFriendNotFoundException,
  FriendshipUnfriendUserNotFoundException,
} from '../../common/exception';
import { FriendshipRepository } from './friendship.repository';
import { FriendshipStatus } from '../../enum/friendshipstatus.enum';
import { FriendshipEntity } from '../../entities/friendship.entity';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  JobNotificationQueue,
  NameNotificationQueue,
} from '../notification/helper/notification.helper';
import { JwtService } from '@nestjs/jwt';
import { Cursor } from '../../common/interface/cursor.interface';
import { ConfigService } from '@nestjs/config';
import { AuthUser } from '../token/authuser.interface';
import { ConvertMediaRelativePathToUrl } from '../../common/helper/media-url.helper';

@Injectable()
export class FriendshipService {
  constructor(
    private readonly friendshipRepo: FriendshipRepository,
    @InjectQueue(NameNotificationQueue)
    private readonly notificationQueue: Queue,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  private mapUser(user: {
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
   * send friend request
   * @param currentUsername
   * @param recipientUsername
   */
  async sendFriendRequest(currentUser: AuthUser, recipientUsername: string) {
    //check if users exist
    const currentUserFound = await this.friendshipRepo.findUserById(
      currentUser.sub,
    );
    const recipientUserFound =
      await this.friendshipRepo.findUserByUsername(recipientUsername);
    if (!currentUserFound || !recipientUserFound) {
      throw new FriendshipSendRequestUserNotFoundException();
    }

    //check if current user sends request to self
    if (currentUserFound.id === recipientUserFound.id) {
      throw new FriendshipSendRequestCantSelfRequestException();
    }

    //check existing friendship
    const friendshipFromCurrent = await this.friendshipRepo.findFriendship(
      currentUserFound.id,
      recipientUserFound.id,
    );
    const friendshipFromRecipient = await this.friendshipRepo.findFriendship(
      recipientUserFound.id,
      currentUserFound.id,
    );
    if (
      friendshipFromCurrent?.status === FriendshipStatus.ACCEPTED ||
      friendshipFromRecipient?.status === FriendshipStatus.ACCEPTED
    ) {
      throw new FriendshipSendRequestFriendshipExistsException();
    }
    //check if current user already sent request to recipient -> throw
    if (friendshipFromCurrent?.status === FriendshipStatus.PENDING) {
      throw new FriendshipSendRequestRequestAlreadySentException();
    }

    //check if current user is blocked by recipient
    const isBlocked = await this.friendshipRepo.checkBlocked(
      currentUserFound.id,
      recipientUserFound.id,
    );
    if (isBlocked) {
      throw new FriendshipSendRequestUserNotFoundException();
    }

    //check if current user blocked recipient
    const isRecipientBlocked = await this.friendshipRepo.checkBlocked(
      recipientUserFound.id,
      currentUserFound.id,
    );
    if (isRecipientBlocked) {
      throw new FriendshipSendRequestRecipientBlockedException();
    }

    //check if recipient already sent request to current user -> auto-accept
    if (friendshipFromRecipient?.status === FriendshipStatus.PENDING) {
      await this.friendshipRepo.acceptFriendRequest(friendshipFromRecipient.id);
      await this.notificationQueue.add(
        JobNotificationQueue.FRIEND_ACCEPTED,
        {
          requester: recipientUserFound,
          recipient: currentUserFound,
        },
        { priority: 1 },
      );
      return { kind: 'friendship_accepted' };
    }

    //create friendship request
    const friendshipEntity: Partial<FriendshipEntity> = {
      requester: currentUserFound,
      recipient: recipientUserFound,
      status: FriendshipStatus.PENDING,
    };
    await this.friendshipRepo.createFriendRequest(friendshipEntity);
    await this.notificationQueue.add(
      JobNotificationQueue.FRIEND_REQUEST,
      {
        requester: currentUserFound,
        recipient: recipientUserFound,
      },
      { priority: 1 },
    );

    return { kind: 'success' };
  }

  /**
   * get received friend requests
   * @param currentUser
   * @param cursor
   */
  async getReceivedFriendRequests(
    currentUser: AuthUser,
    key?: string,
    cursor?: string,
  ) {
    //check cursor and decode
    let cursorDecoded: Cursor | undefined;
    if (cursor) {
      try {
        cursorDecoded = await this.jwtService.verifyAsync<Cursor>(cursor);
      } catch {
        throw new FriendshipGetReceivedRequestsCursorInvalidException();
      }
    } else {
      cursorDecoded = undefined;
    }
    //get received requests
    const receivedFriendRequestListRaw =
      await this.friendshipRepo.findReceivedFriendRequests(
        currentUser.sub,
        cursorDecoded,
        key,
      );
    const requestFinal =
      receivedFriendRequestListRaw[receivedFriendRequestListRaw.length - 1];
    if (!requestFinal) {
      return {
        kind: 'success',
        data: { receivedFriendRequestList: [], cursor: null },
      };
    }
    const receivedFriendRequestList = receivedFriendRequestListRaw.map(
      (request) => ({
        friendshipId: request.id,
        requester: this.mapUser(request.requester),
        createdAt: request.createdAt,
      }),
    );
    //sign next cursor
    const cursorPayload: Cursor = { id: requestFinal.id };
    const cursorToken = await this.jwtService.signAsync(cursorPayload);
    return {
      kind: 'success',
      data: {
        receivedFriendRequestList: receivedFriendRequestList,
        cursor: cursorToken,
      },
    };
  }

  /**
   * get sent friend requests
   * @param currentUser
   * @param cursor
   */
  async getSentFriendRequests(
    currentUser: AuthUser,
    key?: string,
    cursor?: string,
  ) {
    //check cursor and decode
    let cursorDecoded: Cursor | undefined;
    if (cursor) {
      try {
        cursorDecoded = await this.jwtService.verifyAsync<Cursor>(cursor);
      } catch {
        throw new FriendshipGetSentRequestsCursorInvalidException();
      }
    } else {
      cursorDecoded = undefined;
    }
    //get sent requests
    const sentFriendRequestListRaw =
      await this.friendshipRepo.findSentFriendRequests(
        currentUser.sub,
        cursorDecoded,
        key,
      );
    const requestFinal =
      sentFriendRequestListRaw[sentFriendRequestListRaw.length - 1];
    if (!requestFinal) {
      return {
        kind: 'success',
        data: { sentFriendRequestList: [], cursor: null },
      };
    }
    const sentFriendRequestList = sentFriendRequestListRaw.map((request) => ({
      friendshipId: request.id,
      recipient: this.mapUser(request.recipient),
      createdAt: request.createdAt,
    }));
    //sign next cursor
    const cursorPayload: Cursor = { id: requestFinal.id };
    const cursorToken = await this.jwtService.signAsync(cursorPayload);
    return {
      kind: 'success',
      data: {
        sentFriendRequestList: sentFriendRequestList,
        cursor: cursorToken,
      },
    };
  }

  /**
   * accept friend request
   * @param currentUser
   * @param requesterUsername
   */
  async acceptFriendRequest(currentUserId: number, requesterUsername: string) {
    //check if recipient exist
    const requester =
      await this.friendshipRepo.findUserByUsername(requesterUsername);
    if (!requester) {
      throw new FriendshipAcceptRequestRequestNotFoundException();
    }
    //check if request exists
    const friendship = await this.friendshipRepo.findFriendRequest(
      requester.id,
      currentUserId,
    );
    if (!friendship) {
      throw new FriendshipAcceptRequestRequestNotFoundException();
    }
    //accept request
    await this.friendshipRepo.acceptFriendRequest(friendship.id);
    //notify both users
    await this.notificationQueue.add(
      JobNotificationQueue.FRIEND_ACCEPTED,
      {
        requester: friendship.requester,
        recipient: friendship.recipient,
      },
      { priority: 1 },
    );
    return { kind: 'success' };
  }

  /**
   * reject friend request
   * @param currentUser
   * @param friendshipId
   */
  async rejectFriendRequest(currentUserId: number, requesterUsername: string) {
    //check if requester exist
    const requester =
      await this.friendshipRepo.findUserByUsername(requesterUsername);
    if (!requester) {
      throw new FriendshipRejectRequestRequestNotFoundException();
    }
    //check if request exists
    const friendship = await this.friendshipRepo.findFriendRequest(
      requester.id,
      currentUserId,
    );
    if (!friendship) {
      throw new FriendshipRejectRequestRequestNotFoundException();
    }
    //delete friendship
    await this.friendshipRepo.deleteFriendshipById(friendship.id);
    return { kind: 'success' };
  }

  /**
   * cancel friend request
   * @param currentUser
   * @param friendshipId
   */
  async cancelFriendRequest(currentUserId: number, recipientUsername: string) {
    //check if requester exist
    const recipient =
      await this.friendshipRepo.findUserByUsername(recipientUsername);
    if (!recipient) {
      throw new FriendshipCancelRequestRequestNotFoundException();
    }
    //check if request exists
    const friendship = await this.friendshipRepo.findFriendRequest(
      currentUserId,
      recipient.id,
    );
    if (!friendship) {
      throw new FriendshipCancelRequestRequestNotFoundException();
    }
    await this.friendshipRepo.deleteFriendshipById(friendship.id);
    return { kind: 'success' };
  }

  /**
   * get  friend list
   * @param currentUser
   * @param username
   * @param cursor
   */
  async getFriends(
    currentUser: AuthUser,
    targetUsername?: string,
    key?: string,
    cursor?: string,
  ) {
    const currentUserId = currentUser.sub;
    //check if user exist (no target username means the current user's own list)
    const targetUserFound = targetUsername
      ? await this.friendshipRepo.findUserByUsername(targetUsername)
      : await this.friendshipRepo.findUserById(currentUserId);
    if (!targetUserFound) {
      throw new FriendshipGetFriendListUserNotFoundException();
    }
    //check if current user is blocked by target user
    if (currentUserId !== targetUserFound.id) {
      const isBlocked = await this.friendshipRepo.checkBlocked(
        currentUserId,
        targetUserFound.id,
      );
      if (isBlocked) {
        throw new FriendshipGetFriendListUserNotFoundException();
      }
      //check if current user blocked target user
      const isTargetUserBlocked = await this.friendshipRepo.checkBlocked(
        targetUserFound.id,
        currentUserId,
      );
      if (isTargetUserBlocked) {
        throw new FriendshipGetFriendListTargetUserBlockException();
      }
    }
    //check cursor and decode
    let cursorDecoded: Cursor | undefined;
    if (cursor) {
      try {
        cursorDecoded = await this.jwtService.verifyAsync<Cursor>(cursor);
      } catch {
        throw new FriendshipGetFriendListCursorInvalidException();
      }
    } else {
      cursorDecoded = undefined;
    }
    //get friend list
    const friendList = await this.friendshipRepo.findFriends(
      targetUserFound.id,
      currentUserId,
      cursorDecoded?.id,
      key,
    );
    const filterFriendList = friendList.map((friend) => {
      if (friend.id === currentUserId) {
        return {
          username: friend.username,
          displayName: friend.displayName,
          avatarUrl: friend.avatarUrl,
          friendshipId: friend.friendshipId,
        };
      }
      //strip the internal user id to keep the response shape unchanged
      return {
        friendshipId: friend.friendshipId,
        username: friend.username,
        displayName: friend.displayName,
        avatarUrl: friend.avatarUrl,
        friendshipStatus: friend.friendshipStatus,
      };
    });
    const friendFinal = friendList[friendList.length - 1];
    if (!friendFinal) {
      return { kind: 'success', data: { friendList: [], cursor: null } };
    }

    const cursorPayload: Cursor = { id: friendFinal.friendshipId };
    const cursorToken = await this.jwtService.signAsync(cursorPayload);
    return {
      kind: 'success',
      data: { friendList: filterFriendList, cursor: cursorToken },
    };
  }

  /**
   * get friend status with another user
   * @param currentUser
   * @param username
   */
  async getFriendStatus(currentUser: AuthUser, username: string) {
    //check if user exist
    const userFound = await this.friendshipRepo.findUserByUsername(username);
    if (!userFound) {
      throw new FriendshipGetFriendStatusUserNotFoundException();
    }
    //check if current check self
    if (currentUser.sub === userFound.id) {
      throw new FriendshipGetFriendStatusCantSelfCheckException();
    }
    //check if current user got blocked
    const isBlocked = await this.friendshipRepo.checkBlocked(
      currentUser.sub,
      userFound.id,
    );
    if (isBlocked) {
      throw new FriendshipGetFriendStatusUserNotFoundException();
    }
    //check if current user blocked target user
    const isTargetUserBlocked = await this.friendshipRepo.checkBlocked(
      userFound.id,
      currentUser.sub,
    );
    if (isTargetUserBlocked) {
      throw new FriendshipGetFriendStatusTargetUserBlockException();
    }
    const friendship = await this.friendshipRepo.findFriendshipBetween(
      currentUser.sub,
      userFound.id,
    );
    let friendshipStatus:
      | 'accepted'
      | 'pending_sent'
      | 'pending_received'
      | null;
    if (friendship) {
      if (friendship.status === FriendshipStatus.ACCEPTED) {
        friendshipStatus = 'accepted';
      } else {
        friendshipStatus =
          friendship.requester.id === currentUser.sub
            ? 'pending_sent'
            : 'pending_received';
      }
    } else {
      friendshipStatus = null;
    }
    return { kind: 'success', data: { friendshipStatus } };
  }

  /**
   * unfriend user
   * @param currentUser
   * @param username
   */
  async unfriend(currentUser: AuthUser, username: string) {
    //check if user exist
    const userFound = await this.friendshipRepo.findUserByUsername(username);
    if (!userFound) {
      throw new FriendshipUnfriendUserNotFoundException();
    }
    //check if current user self-unfriend
    if (currentUser.sub === userFound.id) {
      throw new FriendshipUnfriendCantSelfUnfriendException();
    }
    //check if current user got blocked
    const isBlocked = await this.friendshipRepo.checkBlocked(
      currentUser.sub,
      userFound.id,
    );
    if (isBlocked) {
      throw new FriendshipUnfriendUserNotFoundException();
    }
    //check friendship exist and accepted
    const friendship = await this.friendshipRepo.findFriendshipBetween(
      currentUser.sub,
      userFound.id,
    );
    if (!friendship || friendship.status !== FriendshipStatus.ACCEPTED) {
      throw new FriendshipUnfriendFriendNotFoundException();
    }
    await this.friendshipRepo.deleteFriendshipById(friendship.id);
    return { kind: 'success' };
  }

  /**
   * get mutual friends with another user
   * @param currentUser
   * @param username
   * @param cursor
   */
  async getMutualFriends(
    currentUser: AuthUser,
    username: string,
    cursor?: string,
  ) {
    //check if user exist
    const userFound = await this.friendshipRepo.findUserByUsername(username);
    if (!userFound) {
      throw new FriendshipGetMutualFriendListUserNotFoundException();
    }
    //check if current user self-get mutual friends
    if (currentUser.sub === userFound.id) {
      throw new FriendshipGetMutualFriendListCantSelfGetException();
    }
    //check if current user is blocked by target user
    if (currentUser.sub !== userFound.id) {
      const isBlocked = await this.friendshipRepo.checkBlocked(
        currentUser.sub,
        userFound.id,
      );
      if (isBlocked) {
        throw new FriendshipGetMutualFriendListUserNotFoundException();
      }
      //check if current user blocked target user
      const isTargetUserBlocked = await this.friendshipRepo.checkBlocked(
        userFound.id,
        currentUser.sub,
      );
      if (isTargetUserBlocked) {
        throw new FriendshipGetMutualFriendListTargetUserBlockException();
      }
    }
    //check cursor and decode
    let cursorDecoded: Cursor | undefined;
    if (cursor) {
      try {
        cursorDecoded = await this.jwtService.verifyAsync<Cursor>(cursor);
      } catch {
        throw new FriendshipGetMutualFriendListCursorInvalidException();
      }
    } else {
      cursorDecoded = undefined;
    }
    //get mutual friends
    const mutualFriendListRaw = await this.friendshipRepo.findMutualFriends(
      currentUser.sub,
      userFound.id,
      cursorDecoded,
    );
    const friendFinal = mutualFriendListRaw[mutualFriendListRaw.length - 1];
    if (!friendFinal) {
      return { kind: 'success', data: { mutualFriendList: [], cursor: null } };
    }
    const mutualFriendList = mutualFriendListRaw.map((friendship) => {
      const friend =
        friendship.requester.id === currentUser.sub
          ? friendship.recipient
          : friendship.requester;
      return {
        friendshipId: friendship.id,
        friend: this.mapUser(friend),
        createdAt: friendship.createdAt,
      };
    });
    const cursorPayload: Cursor = { id: friendFinal.id };
    const cursorToken = await this.jwtService.signAsync(cursorPayload);
    return {
      kind: 'success',
      data: { mutualFriendList: mutualFriendList, cursor: cursorToken },
    };
  }

  /**
   * get friend count
   * @param currentUser
   */
  async getFriendCount(currentUser: AuthUser) {
    const friendCount = await this.friendshipRepo.countFriends(currentUser.sub);
    return { kind: 'success', data: { friendCount } };
  }

  /**
   * get user's friend count
   * @param currentUser
   * @param username
   */
  async getUserFriendCount(currentUser: AuthUser, username: string) {
    //check if user exist
    const userFound = await this.friendshipRepo.findUserByUsername(username);
    if (!userFound) {
      throw new FriendshipGetUserFriendCountUserNotFoundException();
    }
    //check if current user got blocked
    if (currentUser.sub !== userFound.id) {
      const isBlocked = await this.friendshipRepo.checkBlocked(
        currentUser.sub,
        userFound.id,
      );
      if (isBlocked) {
        throw new FriendshipGetUserFriendCountUserNotFoundException();
      }
      //check if current user blocked target user
      const isTargetUserBlocked = await this.friendshipRepo.checkBlocked(
        userFound.id,
        currentUser.sub,
      );
      if (isTargetUserBlocked) {
        throw new FriendshipGetUserFriendCountTargetUserBlockException();
      }
    }
    const friendCount = await this.friendshipRepo.countFriends(userFound.id);
    return { kind: 'success', data: { friendCount } };
  }

  /**
   * get mutual friend count
   * @param currentUser
   * @param username
   */
  async getMutualFriendCount(currentUser: AuthUser, username: string) {
    //check if user exist
    const userFound = await this.friendshipRepo.findUserByUsername(username);
    if (!userFound) {
      throw new FriendshipGetMutualFriendCountUserNotFoundException();
    }
    //check if current user self-get mutual friend number
    if (currentUser.sub === userFound.id) {
      throw new FriendshipGetMutualFriendCountCantSelfGetException();
    }
    //check if current user got blocked
    if (currentUser.sub !== userFound.id) {
      const isBlocked = await this.friendshipRepo.checkBlocked(
        currentUser.sub,
        userFound.id,
      );
      if (isBlocked) {
        throw new FriendshipGetMutualFriendCountUserNotFoundException();
      }
      //check if current user blocked target user
      const isTargetUserBlocked = await this.friendshipRepo.checkBlocked(
        userFound.id,
        currentUser.sub,
      );
      if (isTargetUserBlocked) {
        throw new FriendshipGetMutualFriendCountTargetUserBlockException();
      }
    }
    const mutualCount = await this.friendshipRepo.countMutualFriends(
      currentUser.sub,
      userFound.id,
    );
    return { kind: 'success', data: { mutualCount } };
  }

  /**
   * get sent friend request count
   * @param currentUser
   */
  async getSentFriendRequestCount(currentUser: AuthUser) {
    const sentCount = await this.friendshipRepo.countSentFriendRequests(
      currentUser.sub,
    );
    return { kind: 'success', data: { sentCount } };
  }

  /**
   * get received friend request count
   * @param currentUser
   */
  async getReceivedFriendRequestCount(currentUser: AuthUser) {
    const receivedCount = await this.friendshipRepo.countReceivedFriendRequests(
      currentUser.sub,
    );
    return { kind: 'success', data: { receivedCount } };
  }
}
