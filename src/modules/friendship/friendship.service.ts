import {
  BadRequestException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FriendshipRepository } from './friendship.repository';
import { sendResponse } from '../common/helper/response.helper';
import { message } from '../common/helper/message.helper';
import { errorCode } from '../common/helper/errorcode.helper';
import { FriendshipStatus } from '../enum/friendshipstatus.enum';
import { FriendshipEntity } from '../entities/friendship.entity';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  JobNotificationQueue,
  NameNotificationQueue,
} from '../notification/helper/notification.helper';
import { JwtService } from '@nestjs/jwt';
import { Cursor } from '../interface/cursor.interface';
import { ConfigService } from '@nestjs/config';
import { AuthUser } from '../token/authuser.interface';

@Injectable()
export class FriendshipService {
  private STORAGE_URL: string;
  constructor(
    private readonly friendshipRepo: FriendshipRepository,
    @InjectQueue(NameNotificationQueue)
    private readonly notificationQueue: Queue,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  private mapRequesterUser(user: {
    email: string;
    username: string;
    displayName: string;
    avatarRelativePath?: string | null;
    backgroundImageRelativePath?: string | null;
    gender: unknown;
    dateOfBirth: Date | null;
  }) {
    if (!this.STORAGE_URL) {
      this.STORAGE_URL = this.configService.getOrThrow<string>('STORAGE_URL');
    }
    const avatarUrl = user.avatarRelativePath
      ? this.STORAGE_URL + user.avatarRelativePath
      : null;
    const backgroundImageUrl = user.backgroundImageRelativePath
      ? this.STORAGE_URL + user.backgroundImageRelativePath
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
  async sendFriendRequest(currentUsername: string, recipientUsername: string) {
    //check if current user sends request to self
    if (currentUsername === recipientUsername) {
      throw new BadRequestException(
        sendResponse(
          HttpStatus.BAD_REQUEST,
          message.friendship.send_request.cant_self_request,
          undefined,
          errorCode.friendship.send_request.cant_self_request,
        ),
      );
    }

    //check if users exist
    const currentUserFound =
      await this.friendshipRepo.findUserByUsername(currentUsername);
    const recipientUserFound =
      await this.friendshipRepo.findUserByUsername(recipientUsername);
    if (!currentUserFound || !recipientUserFound) {
      throw new NotFoundException(
        sendResponse(
          HttpStatus.NOT_FOUND,
          message.friendship.send_request.user_not_found,
          undefined,
          errorCode.friendship.send_request.user_not_found,
        ),
      );
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
      throw new BadRequestException(
        sendResponse(
          HttpStatus.BAD_REQUEST,
          message.friendship.send_request.friendship_exists,
          undefined,
          errorCode.friendship.send_request.friendship_exists,
        ),
      );
    }
    //check if current user already sent request to recipient -> throw
    if (friendshipFromCurrent?.status === FriendshipStatus.PENDING) {
      throw new BadRequestException(
        sendResponse(
          HttpStatus.BAD_REQUEST,
          message.friendship.send_request.request_already_sent,
          undefined,
          errorCode.friendship.send_request.request_already_sent,
        ),
      );
    }

    //check if current user is blocked by recipient
    const isBlocked = await this.friendshipRepo.checkBlocked(
      currentUserFound.id,
      recipientUserFound.id,
    );
    if (isBlocked) {
      throw new NotFoundException(
        sendResponse(
          HttpStatus.NOT_FOUND,
          message.friendship.send_request.user_not_found,
          undefined,
          errorCode.friendship.send_request.user_not_found,
        ),
      );
    }

    //check if current user blocked recipient
    const isRecipientBlocked = await this.friendshipRepo.checkBlocked(
      recipientUserFound.id,
      currentUserFound.id,
    );
    if (isRecipientBlocked) {
      throw new BadRequestException(
        sendResponse(
          HttpStatus.BAD_REQUEST,
          message.friendship.send_request.recipient_blocked,
          undefined,
          errorCode.friendship.send_request.recipient_blocked,
        ),
      );
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
      return sendResponse(
        HttpStatus.OK,
        message.friendship.send_request.friendship_accepted,
      );
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

    return sendResponse(HttpStatus.OK, message.friendship.send_request.success);
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
        throw new BadRequestException(
          sendResponse(
            HttpStatus.BAD_REQUEST,
            message.friendship.get_received_requests.cursor_invalid,
            undefined,
            errorCode.friendship.get_received_requests.cursor_invalid,
          ),
        );
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
      return sendResponse(
        HttpStatus.OK,
        message.friendship.get_received_requests.success,
        { receivedFriendRequestList: [], cursor: null },
      );
    }
    const receivedFriendRequestList = receivedFriendRequestListRaw.map(
      (request) => ({
        friendshipId: request.id,
        requester: this.mapRequesterUser(request.requester),
        createdAt: request.createdAt,
      }),
    );
    //sign next cursor
    const cursorPayload: Cursor = { id: requestFinal.id };
    const cursorToken = await this.jwtService.signAsync(cursorPayload);
    return sendResponse(
      HttpStatus.OK,
      message.friendship.get_received_requests.success,
      {
        receivedFriendRequestList: receivedFriendRequestList,
        cursor: cursorToken,
      },
    );
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
        throw new BadRequestException(
          sendResponse(
            HttpStatus.BAD_REQUEST,
            message.friendship.get_sent_requests.cursor_invalid,
            undefined,
            errorCode.friendship.get_sent_requests.cursor_invalid,
          ),
        );
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
      return sendResponse(
        HttpStatus.OK,
        message.friendship.get_sent_requests.success,
        { sentFriendRequestList: [], cursor: null },
      );
    }
    const sentFriendRequestList = sentFriendRequestListRaw.map((request) => ({
      friendshipId: request.id,
      recipient: this.mapRequesterUser(request.recipient),
      createdAt: request.createdAt,
    }));
    //sign next cursor
    const cursorPayload: Cursor = { id: requestFinal.id };
    const cursorToken = await this.jwtService.signAsync(cursorPayload);
    return sendResponse(
      HttpStatus.OK,
      message.friendship.get_sent_requests.success,
      { sentFriendRequestList: sentFriendRequestList, cursor: cursorToken },
    );
  }

  /**
   * accept friend request
   * @param currentUser
   * @param requesterUsername
   */
  async acceptFriendRequest(currentUser: AuthUser, friendshipId: number) {
    //check if request exists
    const friendship =
      await this.friendshipRepo.findFriendshipById(friendshipId);
    if (!friendship) {
      throw new BadRequestException(
        sendResponse(
          HttpStatus.BAD_REQUEST,
          message.friendship.accept_request.request_not_found,
          undefined,
          errorCode.friendship.accept_request.request_not_found,
        ),
      );
    }
    //check if current user is the recipient
    if (friendship.recipient.id !== currentUser.sub) {
      throw new BadRequestException(
        sendResponse(
          HttpStatus.BAD_REQUEST,
          message.friendship.accept_request.request_not_found,
          undefined,
          errorCode.friendship.accept_request.request_not_found,
        ),
      );
    }
    //check if already been friend
    if (friendship.status === FriendshipStatus.ACCEPTED) {
      throw new BadRequestException(
        sendResponse(
          HttpStatus.BAD_REQUEST,
          message.friendship.accept_request.friendship_exists,
          undefined,
          errorCode.friendship.accept_request.friendship_exists,
        ),
      );
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
    return sendResponse(
      HttpStatus.OK,
      message.friendship.accept_request.success,
    );
  }

  /**
   * reject friend request
   * @param currentUser
   * @param friendshipId
   */
  async rejectFriendRequest(currentUser: AuthUser, friendshipId: number) {
    //check if request exists
    const friendship =
      await this.friendshipRepo.findFriendshipById(friendshipId);
    if (!friendship) {
      throw new BadRequestException(
        sendResponse(
          HttpStatus.BAD_REQUEST,
          message.friendship.reject_request.request_not_found,
          undefined,
          errorCode.friendship.reject_request.request_not_found,
        ),
      );
    }
    //check if current user is the recipient
    if (friendship.recipient.id !== currentUser.sub) {
      throw new BadRequestException(
        sendResponse(
          HttpStatus.BAD_REQUEST,
          message.friendship.reject_request.request_not_found,
          undefined,
          errorCode.friendship.reject_request.request_not_found,
        ),
      );
    }
    //check if already been friend
    if (friendship.status === FriendshipStatus.ACCEPTED) {
      throw new BadRequestException(
        sendResponse(
          HttpStatus.BAD_REQUEST,
          message.friendship.reject_request.friendship_exists,
          undefined,
          errorCode.friendship.reject_request.friendship_exists,
        ),
      );
    }
    //delete friendship
    await this.friendshipRepo.deleteFriendshipById(friendship.id);
    return sendResponse(
      HttpStatus.OK,
      message.friendship.reject_request.success,
    );
  }

  /**
   * cancel friend request
   * @param currentUser
   * @param friendshipId
   */
  async cancelFriendRequest(currentUser: AuthUser, friendshipId: number) {
    //check if request exists
    const friendship =
      await this.friendshipRepo.findFriendshipById(friendshipId);
    if (!friendship) {
      throw new BadRequestException(
        sendResponse(
          HttpStatus.BAD_REQUEST,
          message.friendship.cancel_request.request_not_found,
          undefined,
          errorCode.friendship.cancel_request.request_not_found,
        ),
      );
    }
    //check if current user is the requester
    if (friendship.requester.id !== currentUser.sub) {
      throw new BadRequestException(
        sendResponse(
          HttpStatus.BAD_REQUEST,
          message.friendship.cancel_request.request_not_found,
          undefined,
          errorCode.friendship.cancel_request.request_not_found,
        ),
      );
    }
    //check if already been friend
    if (friendship.status === FriendshipStatus.ACCEPTED) {
      throw new BadRequestException(
        sendResponse(
          HttpStatus.BAD_REQUEST,
          message.friendship.cancel_request.friendship_exists,
          undefined,
          errorCode.friendship.cancel_request.friendship_exists,
        ),
      );
    }
    await this.friendshipRepo.deleteFriendshipById(friendship.id);
    return sendResponse(
      HttpStatus.OK,
      message.friendship.cancel_request.success,
    );
  }

  /**
   * get friend list
   * @param currentUser
   * @param cursor
   */
  async getFriends(currentUser: AuthUser, key?: string, cursor?: string) {
    //check cursor and decode
    let cursorDecoded: Cursor | undefined;
    if (cursor) {
      try {
        cursorDecoded = await this.jwtService.verifyAsync<Cursor>(cursor);
      } catch {
        throw new BadRequestException(
          sendResponse(
            HttpStatus.BAD_REQUEST,
            message.friendship.get_friend_list.cursor_invalid,
            undefined,
            errorCode.friendship.get_friend_list.cursor_invalid,
          ),
        );
      }
    } else {
      cursorDecoded = undefined;
    }
    //get friend list
    const friendListRaw = await this.friendshipRepo.findFriends(
      currentUser.sub,
      cursorDecoded,
      key,
    );
    const friendFinal = friendListRaw[friendListRaw.length - 1];
    if (!friendFinal) {
      return sendResponse(
        HttpStatus.OK,
        message.friendship.get_friend_list.success,
        { friendList: [], cursor: null },
      );
    }
    const friendList = friendListRaw.map((friendship) => {
      const friend =
        friendship.requester.id === currentUser.sub
          ? friendship.recipient
          : friendship.requester;
      return {
        friendshipId: friendship.id,
        friend: this.mapRequesterUser(friend),
        createdAt: friendship.createdAt,
      };
    });
    const cursorPayload: Cursor = { id: friendFinal.id };
    const cursorToken = await this.jwtService.signAsync(cursorPayload);
    return sendResponse(
      HttpStatus.OK,
      message.friendship.get_friend_list.success,
      { friendList: friendList, cursor: cursorToken },
    );
  }

  /**
   * get user's friend list
   * @param currentUser
   * @param username
   * @param cursor
   */
  async getUserFriends(
    currentUser: AuthUser,
    username: string,
    key?: string,
    cursor?: string,
  ) {
    //check if user exist
    const userFound = await this.friendshipRepo.findUserByUsername(username);
    if (!userFound) {
      throw new NotFoundException(
        sendResponse(
          HttpStatus.NOT_FOUND,
          message.friendship.get_user_friend_list.user_not_found,
          undefined,
          errorCode.friendship.get_user_friend_list.user_not_found,
        ),
      );
    }
    //check if current user is blocked by target user
    if (currentUser.sub !== userFound.id) {
      const isBlocked = await this.friendshipRepo.checkBlocked(
        currentUser.sub,
        userFound.id,
      );
      if (isBlocked) {
        throw new NotFoundException(
          sendResponse(
            HttpStatus.NOT_FOUND,
            message.friendship.get_user_friend_list.user_not_found,
            undefined,
            errorCode.friendship.get_user_friend_list.user_not_found,
          ),
        );
      }
    }
    //check cursor and decode
    let cursorDecoded: Cursor | undefined;
    if (cursor) {
      try {
        cursorDecoded = await this.jwtService.verifyAsync<Cursor>(cursor);
      } catch {
        throw new BadRequestException(
          sendResponse(
            HttpStatus.BAD_REQUEST,
            message.friendship.get_user_friend_list.cursor_invalid,
            undefined,
            errorCode.friendship.get_user_friend_list.cursor_invalid,
          ),
        );
      }
    } else {
      cursorDecoded = undefined;
    }
    //get friend list
    const friendListRaw = await this.friendshipRepo.findFriends(
      userFound.id,
      cursorDecoded,
      key,
    );
    const friendFinal = friendListRaw[friendListRaw.length - 1];
    if (!friendFinal) {
      return sendResponse(
        HttpStatus.OK,
        message.friendship.get_user_friend_list.success,
        { friendList: [], cursor: null },
      );
    }
    //get friend status of users in the friendlist relative to the current user
    const friendIds = friendListRaw.map((friendship) =>
      friendship.requester.id === userFound.id
        ? friendship.recipient.id
        : friendship.requester.id,
    );
    const acceptedFriendIds = await this.friendshipRepo.findAcceptedFriendIds(
      currentUser.sub,
      friendIds,
    );
    const acceptedFriendSet = new Set(acceptedFriendIds);
    const friendList = friendListRaw.map((friendship) => {
      const friend =
        friendship.requester.id === userFound.id
          ? friendship.recipient
          : friendship.requester;
      return {
        friend: this.mapRequesterUser(friend),
        isFriend:
          friend.id === currentUser.sub
            ? undefined
            : acceptedFriendSet.has(friend.id),
        createdAt: friendship.createdAt,
      };
    });
    const cursorPayload: Cursor = { id: friendFinal.id };
    const cursorToken = await this.jwtService.signAsync(cursorPayload);
    return sendResponse(
      HttpStatus.OK,
      message.friendship.get_user_friend_list.success,
      { friendList: friendList, cursor: cursorToken },
    );
  }

  /**
   * get friend status with another user
   * @param currentUser
   * @param username
   */
  async getFriendStatus(currentUser: AuthUser, username: string) {
    //check if current check self
    if (currentUser.username === username) {
      throw new BadRequestException(
        sendResponse(
          HttpStatus.BAD_REQUEST,
          message.friendship.get_friend_status.cant_self_check,
          undefined,
          errorCode.friendship.get_friend_status.cant_self_check,
        ),
      );
    }
    //check if user exist
    const userFound = await this.friendshipRepo.findUserByUsername(username);
    if (!userFound) {
      throw new NotFoundException(
        sendResponse(
          HttpStatus.NOT_FOUND,
          message.friendship.get_friend_status.user_not_found,
          undefined,
          errorCode.friendship.get_friend_status.user_not_found,
        ),
      );
    }
    //check if current user got blocked
    const isBlocked = await this.friendshipRepo.checkBlocked(
      currentUser.sub,
      userFound.id,
    );
    if (isBlocked) {
      throw new NotFoundException(
        sendResponse(
          HttpStatus.NOT_FOUND,
          message.friendship.get_friend_status.user_not_found,
          undefined,
          errorCode.friendship.get_friend_status.user_not_found,
        ),
      );
    }
    const friendship = await this.friendshipRepo.findFriendshipBetween(
      currentUser.sub,
      userFound.id,
    );
    let friendStatus = 'none';
    if (friendship) {
      if (friendship.status === FriendshipStatus.ACCEPTED) {
        friendStatus = 'accepted';
      } else if (friendship.status === FriendshipStatus.PENDING) {
        friendStatus =
          friendship.requester.id === currentUser.sub
            ? 'pending_sent'
            : 'pending_received';
      }
    }
    return sendResponse(
      HttpStatus.OK,
      message.friendship.get_friend_status.success,
      { friendStatus },
    );
  }

  /**
   * unfriend user
   * @param currentUser
   * @param username
   */
  async unfriend(currentUser: AuthUser, username: string) {
    //check if current user self-unfriend
    if (currentUser.username === username) {
      throw new BadRequestException(
        sendResponse(
          HttpStatus.BAD_REQUEST,
          message.friendship.unfriend.cant_self_unfriend,
          undefined,
          errorCode.friendship.unfriend.cant_self_unfriend,
        ),
      );
    }
    //check if user exist
    const userFound = await this.friendshipRepo.findUserByUsername(username);
    if (!userFound) {
      throw new NotFoundException(
        sendResponse(
          HttpStatus.NOT_FOUND,
          message.friendship.unfriend.user_not_found,
          undefined,
          errorCode.friendship.unfriend.user_not_found,
        ),
      );
    }
    //check if current user got blocked
    const isBlocked = await this.friendshipRepo.checkBlocked(
      currentUser.sub,
      userFound.id,
    );
    if (isBlocked) {
      throw new NotFoundException(
        sendResponse(
          HttpStatus.NOT_FOUND,
          message.friendship.unfriend.user_not_found,
          undefined,
          errorCode.friendship.unfriend.user_not_found,
        ),
      );
    }
    //check friendship exist and accepted
    const friendship = await this.friendshipRepo.findFriendshipBetween(
      currentUser.sub,
      userFound.id,
    );
    if (!friendship || friendship.status !== FriendshipStatus.ACCEPTED) {
      throw new BadRequestException(
        sendResponse(
          HttpStatus.BAD_REQUEST,
          message.friendship.unfriend.friend_not_found,
          undefined,
          errorCode.friendship.unfriend.friend_not_found,
        ),
      );
    }
    await this.friendshipRepo.deleteFriendshipById(friendship.id);
    return sendResponse(HttpStatus.OK, message.friendship.unfriend.success);
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
    //check if current user self-get mutual friends
    if (currentUser.username === username) {
      throw new BadRequestException(
        sendResponse(
          HttpStatus.BAD_REQUEST,
          message.friendship.get_mutual_friend_list.cant_self_get,
          undefined,
          errorCode.friendship.get_mutual_friend_list.cant_self_get,
        ),
      );
    }
    //check if user exist
    const userFound = await this.friendshipRepo.findUserByUsername(username);
    if (!userFound) {
      throw new NotFoundException(
        sendResponse(
          HttpStatus.NOT_FOUND,
          message.friendship.get_mutual_friend_list.user_not_found,
          undefined,
          errorCode.friendship.get_mutual_friend_list.user_not_found,
        ),
      );
    }
    //check if current user is blocked by target user
    if (currentUser.sub !== userFound.id) {
      const isBlocked = await this.friendshipRepo.checkBlocked(
        currentUser.sub,
        userFound.id,
      );
      if (isBlocked) {
        throw new NotFoundException(
          sendResponse(
            HttpStatus.NOT_FOUND,
            message.friendship.get_mutual_friend_list.user_not_found,
            undefined,
            errorCode.friendship.get_mutual_friend_list.user_not_found,
          ),
        );
      }
    }
    //check cursor and decode
    let cursorDecoded: Cursor | undefined;
    if (cursor) {
      try {
        cursorDecoded = await this.jwtService.verifyAsync<Cursor>(cursor);
      } catch {
        throw new BadRequestException(
          sendResponse(
            HttpStatus.BAD_REQUEST,
            message.friendship.get_mutual_friend_list.cursor_invalid,
            undefined,
            errorCode.friendship.get_mutual_friend_list.cursor_invalid,
          ),
        );
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
      return sendResponse(
        HttpStatus.OK,
        message.friendship.get_mutual_friend_list.success,
        { mutualFriendList: [], cursor: null },
      );
    }
    const mutualFriendList = mutualFriendListRaw.map((friendship) => {
      const friend =
        friendship.requester.id === currentUser.sub
          ? friendship.recipient
          : friendship.requester;
      return {
        friendshipId: friendship.id,
        friend: this.mapRequesterUser(friend),
        createdAt: friendship.createdAt,
      };
    });
    const cursorPayload: Cursor = { id: friendFinal.id };
    const cursorToken = await this.jwtService.signAsync(cursorPayload);
    return sendResponse(
      HttpStatus.OK,
      message.friendship.get_mutual_friend_list.success,
      { mutualFriendList: mutualFriendList, cursor: cursorToken },
    );
  }

  /**
   * get friend count
   * @param currentUser
   */
  async getFriendCount(currentUser: AuthUser) {
    const friendCount = await this.friendshipRepo.countFriends(currentUser.sub);
    return sendResponse(
      HttpStatus.OK,
      message.friendship.get_friend_count.success,
      { friendCount },
    );
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
      throw new NotFoundException(
        sendResponse(
          HttpStatus.NOT_FOUND,
          message.friendship.get_user_friend_count.user_not_found,
          undefined,
          errorCode.friendship.get_user_friend_count.user_not_found,
        ),
      );
    }
    //check if current user got blocked
    if (currentUser.sub !== userFound.id) {
      const isBlocked = await this.friendshipRepo.checkBlocked(
        currentUser.sub,
        userFound.id,
      );
      if (isBlocked) {
        throw new NotFoundException(
          sendResponse(
            HttpStatus.NOT_FOUND,
            message.friendship.get_user_friend_count.user_not_found,
            undefined,
            errorCode.friendship.get_user_friend_count.user_not_found,
          ),
        );
      }
    }
    const friendCount = await this.friendshipRepo.countFriends(userFound.id);
    return sendResponse(
      HttpStatus.OK,
      message.friendship.get_user_friend_count.success,
      { friendCount },
    );
  }

  /**
   * get mutual friend count
   * @param currentUser
   * @param username
   */
  async getMutualFriendCount(currentUser: AuthUser, username: string) {
    //check if current user self-get mutual friend number
    if (currentUser.username === username) {
      throw new BadRequestException(
        sendResponse(
          HttpStatus.BAD_REQUEST,
          message.friendship.get_mutual_friend_count.cant_self_get,
          undefined,
          errorCode.friendship.get_mutual_friend_count.cant_self_get,
        ),
      );
    }
    //check if user exist
    const userFound = await this.friendshipRepo.findUserByUsername(username);
    if (!userFound) {
      throw new NotFoundException(
        sendResponse(
          HttpStatus.NOT_FOUND,
          message.friendship.get_mutual_friend_count.user_not_found,
          undefined,
          errorCode.friendship.get_mutual_friend_count.user_not_found,
        ),
      );
    }
    //check if current user got blocked
    if (currentUser.sub !== userFound.id) {
      const isBlocked = await this.friendshipRepo.checkBlocked(
        currentUser.sub,
        userFound.id,
      );
      if (isBlocked) {
        throw new NotFoundException(
          sendResponse(
            HttpStatus.NOT_FOUND,
            message.friendship.get_mutual_friend_count.user_not_found,
            undefined,
            errorCode.friendship.get_mutual_friend_count.user_not_found,
          ),
        );
      }
    }
    const mutualCount = await this.friendshipRepo.countMutualFriends(
      currentUser.sub,
      userFound.id,
    );
    return sendResponse(
      HttpStatus.OK,
      message.friendship.get_mutual_friend_count.success,
      { mutualCount },
    );
  }

  /**
   * get sent friend request count
   * @param currentUser
   */
  async getSentFriendRequestCount(currentUser: AuthUser) {
    const sentCount = await this.friendshipRepo.countSentFriendRequests(
      currentUser.sub,
    );
    return sendResponse(
      HttpStatus.OK,
      message.friendship.get_sent_request_count.success,
      { sentCount },
    );
  }

  /**
   * get received friend request count
   * @param currentUser
   */
  async getReceivedFriendRequestCount(currentUser: AuthUser) {
    const receivedCount = await this.friendshipRepo.countReceivedFriendRequests(
      currentUser.sub,
    );
    return sendResponse(
      HttpStatus.OK,
      message.friendship.get_received_request_count.success,
      { receivedCount },
    );
  }
}
