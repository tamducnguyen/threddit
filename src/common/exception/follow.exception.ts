import { HttpStatus } from '@nestjs/common';
import { BaseServiceException } from './base-service.exception';
import { message } from '../helper/message.helper';
import { errorCode } from '../helper/errorcode.helper';

export class FollowDeleteFollowFollowNotFoundException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.follow.delete_follow.follow_not_found;
  readonly message = message.follow.delete_follow.follow_not_found;
}

export class FollowDeleteFollowUserNotFoundException extends BaseServiceException {
  readonly statusCode = HttpStatus.NOT_FOUND;
  readonly errorCode = errorCode.follow.delete_follow.user_not_found;
  readonly message = message.follow.delete_follow.user_not_found;
}

export class FollowGetFollowNumberTargetUserBlockException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.follow.get_follow_number.target_user_block;
  readonly message = message.follow.get_follow_number.target_user_block;
}

export class FollowGetFollowNumberUserNotFoundException extends BaseServiceException {
  readonly statusCode = HttpStatus.NOT_FOUND;
  readonly errorCode = errorCode.follow.get_follow_number.user_not_found;
  readonly message = message.follow.get_follow_number.user_not_found;
}

export class FollowGetFollowStateCanNotSelfCheckException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = undefined;
  readonly message = message.follow.get_follow_state.can_not_self_check;
}

export class FollowGetFollowStateTargetUserBlockException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.follow.get_follow_state.target_user_block;
  readonly message = message.follow.get_follow_state.target_user_block;
}

export class FollowGetFollowStateUserNotFoundException extends BaseServiceException {
  readonly statusCode = HttpStatus.NOT_FOUND;
  readonly errorCode = errorCode.follow.get_follow_state.user_not_found;
  readonly message = message.follow.get_follow_state.user_not_found;
}

export class FollowGetFollowerListCursorInvalidException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.follow.get_follower_list.cursor_invalid;
  readonly message = message.follow.get_follower_list.cursor_invalid;
}

export class FollowGetFollowerListTargetUserBlockException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.follow.get_follower_list.target_user_block;
  readonly message = message.follow.get_follower_list.target_user_block;
}

export class FollowGetFollowerListUserNotFoundException extends BaseServiceException {
  readonly statusCode = HttpStatus.NOT_FOUND;
  readonly errorCode = errorCode.follow.get_follower_list.user_not_found;
  readonly message = message.follow.get_follower_list.user_not_found;
}

export class FollowGetFollowingListCursorInvalidException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.follow.get_following_list.cursor_invalid;
  readonly message = message.follow.get_following_list.cursor_invalid;
}

export class FollowGetFollowingListTargetUserBlockException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.follow.get_following_list.target_user_block;
  readonly message = message.follow.get_following_list.target_user_block;
}

export class FollowGetFollowingListUserNotFoundException extends BaseServiceException {
  readonly statusCode = HttpStatus.NOT_FOUND;
  readonly errorCode = errorCode.follow.get_following_list.user_not_found;
  readonly message = message.follow.get_following_list.user_not_found;
}

export class FollowPostFollowCantSelfFollowException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.follow.post_follow.cant_self_follow;
  readonly message = message.follow.post_follow.cant_self_follow;
}

export class FollowPostFollowFollowAlreadyException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.follow.post_follow.follow_already;
  readonly message = message.follow.post_follow.follow_already;
}

export class FollowPostFollowFolloweeBlockedException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.follow.post_follow.followee_blocked;
  readonly message = message.follow.post_follow.followee_blocked;
}

export class FollowPostFollowUserNotFoundException extends BaseServiceException {
  readonly statusCode = HttpStatus.NOT_FOUND;
  readonly errorCode = errorCode.follow.post_follow.user_not_found;
  readonly message = message.follow.post_follow.user_not_found;
}
