import { HttpStatus } from '@nestjs/common';
import { BaseServiceException } from './base-service.exception';
import { message } from '../helper/message.helper';
import { errorCode } from '../helper/errorcode.helper';

export class BlockDeleteBlockCantSelfUnblockException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.block.delete_block.cant_self_unblock;
  readonly message = message.block.delete_block.cant_self_unblock;
}

export class BlockDeleteBlockNotBlockedException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.block.delete_block.not_blocked;
  readonly message = message.block.delete_block.not_blocked;
}

export class BlockDeleteBlockUserNotFoundException extends BaseServiceException {
  readonly statusCode = HttpStatus.NOT_FOUND;
  readonly errorCode = errorCode.block.delete_block.user_not_found;
  readonly message = message.block.delete_block.user_not_found;
}

export class BlockGetBlockStatusCantSelfCheckException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.block.get_block_status.cant_self_check;
  readonly message = message.block.get_block_status.cant_self_check;
}

export class BlockGetBlockStatusUserNotFoundException extends BaseServiceException {
  readonly statusCode = HttpStatus.NOT_FOUND;
  readonly errorCode = errorCode.block.get_block_status.user_not_found;
  readonly message = message.block.get_block_status.user_not_found;
}

export class BlockGetBlockedListCursorInvalidException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.block.get_blocked_list.cursor_invalid;
  readonly message = message.block.get_blocked_list.cursor_invalid;
}

export class BlockGetBlockedListUserNotFoundException extends BaseServiceException {
  readonly statusCode = HttpStatus.NOT_FOUND;
  readonly errorCode = errorCode.block.get_blocked_list.user_not_found;
  readonly message = message.block.get_blocked_list.user_not_found;
}

export class BlockPostBlockAlreadyBlockedException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.block.post_block.already_blocked;
  readonly message = message.block.post_block.already_blocked;
}

export class BlockPostBlockCantSelfBlockException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.block.post_block.cant_self_block;
  readonly message = message.block.post_block.cant_self_block;
}

export class BlockPostBlockUserNotFoundException extends BaseServiceException {
  readonly statusCode = HttpStatus.NOT_FOUND;
  readonly errorCode = errorCode.block.post_block.user_not_found;
  readonly message = message.block.post_block.user_not_found;
}

/**
 * Shared by BlockService.validateBlock() for both "target user does not
 * exist" (when a caller does not pre-check existence) and "current user is
 * blocked by target" (hidden as not-found so the target's existence cannot
 * be probed).
 */
export class BlockedOrNotFoundException extends BaseServiceException {
  readonly statusCode = HttpStatus.NOT_FOUND;
  readonly errorCode = errorCode.common.blocked_or_not_found;
  readonly message = message.common.blocked_or_not_found;
}

/** Shared by BlockService.validateBlock() when current user has blocked the target. */
export class SelfBlockedTargetException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.common.self_blocked_target;
  readonly message = message.common.self_blocked_target;
}
