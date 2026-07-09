import { HttpStatus } from '@nestjs/common';
import { BaseServiceException } from './base-service.exception';
import { message } from '../helper/message.helper';
import { errorCode } from '../helper/errorcode.helper';

export class CommonAccountNotActivateException extends BaseServiceException {
  readonly statusCode = HttpStatus.UNAUTHORIZED;
  readonly errorCode = errorCode.common.account_not_activate;
  readonly message = message.common.account_not_activate;
}

export class CommonSessionRevokedException extends BaseServiceException {
  readonly statusCode = HttpStatus.UNAUTHORIZED;
  readonly errorCode = errorCode.common.session_revoked;
  readonly message = message.common.session_revoked;
}

export class CommonTokenNotFoundException extends BaseServiceException {
  readonly statusCode = HttpStatus.UNAUTHORIZED;
  readonly errorCode = errorCode.common.token_not_found;
  readonly message = message.common.token_not_found;
}

export class CommonTooManyRequestsException extends BaseServiceException {
  readonly statusCode = HttpStatus.TOO_MANY_REQUESTS;
  readonly errorCode = errorCode.common.too_many_requests;
  readonly message = message.common.too_many_requests;
}
