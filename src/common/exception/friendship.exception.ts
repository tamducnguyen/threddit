import { HttpStatus } from '@nestjs/common';
import { BaseServiceException } from './base-service.exception';
import { message } from '../helper/message.helper';
import { errorCode } from '../helper/errorcode.helper';

export class FriendshipAcceptRequestRequestNotFoundException extends BaseServiceException {
  readonly statusCode = HttpStatus.NOT_FOUND;
  readonly errorCode = errorCode.friendship.accept_request.request_not_found;
  readonly message = message.friendship.accept_request.request_not_found;
}

export class FriendshipCancelRequestRequestNotFoundException extends BaseServiceException {
  readonly statusCode = HttpStatus.NOT_FOUND;
  readonly errorCode = errorCode.friendship.cancel_request.request_not_found;
  readonly message = message.friendship.cancel_request.request_not_found;
}

export class FriendshipGetFriendListCursorInvalidException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.friendship.get_friend_list.cursor_invalid;
  readonly message = message.friendship.get_friend_list.cursor_invalid;
}

export class FriendshipGetFriendListUserNotFoundException extends BaseServiceException {
  readonly statusCode = HttpStatus.NOT_FOUND;
  readonly errorCode = errorCode.friendship.get_friend_list.user_not_found;
  readonly message = message.friendship.get_friend_list.user_not_found;
}

export class FriendshipGetFriendStatusCantSelfCheckException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.friendship.get_friend_status.cant_self_check;
  readonly message = message.friendship.get_friend_status.cant_self_check;
}

export class FriendshipGetFriendStatusUserNotFoundException extends BaseServiceException {
  readonly statusCode = HttpStatus.NOT_FOUND;
  readonly errorCode = errorCode.friendship.get_friend_status.user_not_found;
  readonly message = message.friendship.get_friend_status.user_not_found;
}

export class FriendshipGetMutualFriendCountCantSelfGetException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode =
    errorCode.friendship.get_mutual_friend_count.cant_self_get;
  readonly message = message.friendship.get_mutual_friend_count.cant_self_get;
}

export class FriendshipGetMutualFriendCountUserNotFoundException extends BaseServiceException {
  readonly statusCode = HttpStatus.NOT_FOUND;
  readonly errorCode =
    errorCode.friendship.get_mutual_friend_count.user_not_found;
  readonly message = message.friendship.get_mutual_friend_count.user_not_found;
}

export class FriendshipGetMutualFriendListCantSelfGetException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode =
    errorCode.friendship.get_mutual_friend_list.cant_self_get;
  readonly message = message.friendship.get_mutual_friend_list.cant_self_get;
}

export class FriendshipGetMutualFriendListCursorInvalidException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode =
    errorCode.friendship.get_mutual_friend_list.cursor_invalid;
  readonly message = message.friendship.get_mutual_friend_list.cursor_invalid;
}

export class FriendshipGetMutualFriendListUserNotFoundException extends BaseServiceException {
  readonly statusCode = HttpStatus.NOT_FOUND;
  readonly errorCode =
    errorCode.friendship.get_mutual_friend_list.user_not_found;
  readonly message = message.friendship.get_mutual_friend_list.user_not_found;
}

export class FriendshipGetReceivedRequestsCursorInvalidException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode =
    errorCode.friendship.get_received_requests.cursor_invalid;
  readonly message = message.friendship.get_received_requests.cursor_invalid;
}

export class FriendshipGetSentRequestsCursorInvalidException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.friendship.get_sent_requests.cursor_invalid;
  readonly message = message.friendship.get_sent_requests.cursor_invalid;
}

export class FriendshipGetUserFriendCountUserNotFoundException extends BaseServiceException {
  readonly statusCode = HttpStatus.NOT_FOUND;
  readonly errorCode =
    errorCode.friendship.get_user_friend_count.user_not_found;
  readonly message = message.friendship.get_user_friend_count.user_not_found;
}

export class FriendshipRejectRequestRequestNotFoundException extends BaseServiceException {
  readonly statusCode = HttpStatus.NOT_FOUND;
  readonly errorCode = errorCode.friendship.reject_request.request_not_found;
  readonly message = message.friendship.reject_request.request_not_found;
}

export class FriendshipSendRequestCantSelfRequestException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.friendship.send_request.cant_self_request;
  readonly message = message.friendship.send_request.cant_self_request;
}

export class FriendshipSendRequestFriendshipExistsException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.friendship.send_request.friendship_exists;
  readonly message = message.friendship.send_request.friendship_exists;
}

export class FriendshipSendRequestRequestAlreadySentException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.friendship.send_request.request_already_sent;
  readonly message = message.friendship.send_request.request_already_sent;
}

export class FriendshipSendRequestUserNotFoundException extends BaseServiceException {
  readonly statusCode = HttpStatus.NOT_FOUND;
  readonly errorCode = errorCode.friendship.send_request.user_not_found;
  readonly message = message.friendship.send_request.user_not_found;
}

export class FriendshipUnfriendCantSelfUnfriendException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.friendship.unfriend.cant_self_unfriend;
  readonly message = message.friendship.unfriend.cant_self_unfriend;
}

export class FriendshipUnfriendFriendNotFoundException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.friendship.unfriend.friend_not_found;
  readonly message = message.friendship.unfriend.friend_not_found;
}

export class FriendshipUnfriendUserNotFoundException extends BaseServiceException {
  readonly statusCode = HttpStatus.NOT_FOUND;
  readonly errorCode = errorCode.friendship.unfriend.user_not_found;
  readonly message = message.friendship.unfriend.user_not_found;
}
