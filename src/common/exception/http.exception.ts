import { HttpStatus } from '@nestjs/common';
import { BaseServiceException } from './base-service.exception';
import { message } from '../helper/message.helper';
import { errorCode } from '../helper/errorcode.helper';

export class HttpCheckToxicToxicException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.http.check_toxic.toxic;
  readonly message = message.http.check_toxic.toxic;
}

export class HttpCommonTimeOutException extends BaseServiceException {
  readonly statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
  readonly errorCode = errorCode.http.common.time_out;
  readonly message = message.http.common.time_out;
}
