import { HttpStatus } from '@nestjs/common';
import { BaseServiceException } from './base-service.exception';
import { message } from '../helper/message.helper';
import { errorCode } from '../helper/errorcode.helper';

export class NotificationCreateStreamUserNotFoundException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.notification.create_stream.user_not_found;
  readonly message = message.notification.create_stream.user_not_found;
}

export class NotificationDeleteNotificationNotFoundException extends BaseServiceException {
  readonly statusCode = HttpStatus.NOT_FOUND;
  readonly errorCode = errorCode.notification.delete_notification.not_found;
  readonly message = message.notification.delete_notification.not_found;
}

export class NotificationGetCountUnreadUserNotFoundException extends BaseServiceException {
  readonly statusCode = HttpStatus.NOT_FOUND;
  readonly errorCode = errorCode.notification.get_count_unread.user_not_found;
  readonly message = message.notification.get_count_unread.user_not_found;
}

export class NotificationGetNotificationCursorInvalidException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.notification.get_notification.cursor_invalid;
  readonly message = message.notification.get_notification.cursor_invalid;
}

export class NotificationGetNotificationUserNotFoundException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.notification.get_notification.user_not_found;
  readonly message = message.notification.get_notification.user_not_found;
}

export class NotificationGetUnreadNotificationCursorInvalidException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode =
    errorCode.notification.get_unread_notification.cursor_invalid;
  readonly message =
    message.notification.get_unread_notification.cursor_invalid;
}

export class NotificationGetUnreadNotificationUserNotFoundException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode =
    errorCode.notification.get_unread_notification.user_not_found;
  readonly message =
    message.notification.get_unread_notification.user_not_found;
}

export class NotificationReadNotificationNotFoundOrAlreadyReadException extends BaseServiceException {
  readonly statusCode = HttpStatus.NOT_FOUND;
  readonly errorCode =
    errorCode.notification.read_notification.not_found_or_already_read;
  readonly message =
    message.notification.read_notification.not_found_or_already_read;
}
