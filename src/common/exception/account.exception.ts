import { HttpStatus } from '@nestjs/common';
import { BaseServiceException } from './base-service.exception';
import { message } from '../helper/message.helper';
import { errorCode } from '../helper/errorcode.helper';

export class AccountDeleteAccountInvalidOrExpiredCodeException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.account.delete_account.invalid_or_expired_code;
  readonly message = message.account.delete_account.invalid_or_expired_code;
}

export class AccountDeleteAccountMailThrottledException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.account.delete_account.mail_throttled;
  readonly message = message.account.delete_account.mail_throttled;
}

export class AccountDeleteAccountTooManyAttemptsException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.account.delete_account.too_many_attempts;
  readonly message = message.account.delete_account.too_many_attempts;
}

export class AccountDeleteAccountUserNotFoundException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.account.delete_account.user_not_found;
  readonly message = message.account.delete_account.user_not_found;
}

export class AccountGetUserInfoUserNotFoundException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.account.get_user_info.user_not_found;
  readonly message = message.account.get_user_info.user_not_found;
}

export class AccountUpdatePasswordNotSupportThisAuthMethodException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode =
    errorCode.account.update_password.not_support_this_auth_method;
  readonly message =
    message.account.update_password.not_support_this_auth_method;
}

export class AccountUpdatePasswordPassportSameException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.account.update_password.passport_same;
  readonly message = message.account.update_password.passport_same;
}

export class AccountUpdatePasswordPasswordIncorrectException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.account.update_password.password_incorrect;
  readonly message = message.account.update_password.password_incorrect;
}

export class AccountUpdatePasswordPasswordMismatchException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.account.update_password.password_mismatch;
  readonly message = message.account.update_password.password_mismatch;
}

export class AccountUpdatePasswordUserNotFoundException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.account.update_password.user_not_found;
  readonly message = message.account.update_password.user_not_found;
}

export class AccountUpdateUsernameUserNotFoundException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.account.update_username.user_not_found;
  readonly message = message.account.update_username.user_not_found;
}

export class AccountUpdateUsernameUsernameDuplicateException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.account.update_username.username_duplicate;
  readonly message = message.account.update_username.username_duplicate;
}

export class AccountUpdateUsernameUsernameExistException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.account.update_username.username_exist;
  readonly message = message.account.update_username.username_exist;
}
