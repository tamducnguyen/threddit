import { HttpStatus } from '@nestjs/common';
import { BaseServiceException } from './base-service.exception';
import { message } from '../helper/message.helper';
import { errorCode } from '../helper/errorcode.helper';

export class AuthGoogleAuthAccountNotActivateException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.auth.google_auth.account_not_activate;
  readonly message = message.auth.google_auth.account_not_activate;
}

export class AuthGoogleAuthAlreadyAuthMethodException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.auth.google_auth.already_auth_method;
  readonly message = message.auth.google_auth.already_auth_method;
}

export class AuthGoogleAuthEmailNotVerifiedException extends BaseServiceException {
  readonly statusCode = HttpStatus.UNAUTHORIZED;
  readonly errorCode = errorCode.auth.google_auth.email_not_verified;
  readonly message = message.auth.google_auth.email_not_verified;
}

export class AuthGoogleAuthIdTokenMissingException extends BaseServiceException {
  readonly statusCode = HttpStatus.UNAUTHORIZED;
  readonly errorCode = errorCode.auth.google_auth.id_token_missing;
  readonly message = message.auth.google_auth.id_token_missing;
}

export class AuthGoogleAuthInvalidTokenException extends BaseServiceException {
  readonly statusCode = HttpStatus.UNAUTHORIZED;
  readonly errorCode = errorCode.auth.google_auth.invalid_token;
  readonly message = message.auth.google_auth.invalid_token;
}

export class AuthResendVerificationCodeAlreadyVerifiedException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.auth.resend_verification_code.already_verified;
  readonly message = message.auth.resend_verification_code.already_verified;
}

export class AuthResendVerificationCodeEmailNotExistsException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.auth.resend_verification_code.email_not_exists;
  readonly message = message.auth.resend_verification_code.email_not_exists;
}

export class AuthResendVerificationCodeMailThrottledException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.auth.resend_verification_code.mail_throttled;
  readonly message = message.auth.resend_verification_code.mail_throttled;
}

export class AuthResendVerificationCodeTooManyAttemptsException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode =
    errorCode.auth.resend_verification_code.too_many_attempts;
  readonly message = message.auth.resend_verification_code.too_many_attempts;
}

export class AuthResetPasswordMailThrottledException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.auth.reset_password.mail_throttled;
  readonly message = message.auth.reset_password.mail_throttled;
}

export class AuthResetPasswordTooManyAttemptsException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.auth.reset_password.too_many_attempts;
  readonly message = message.auth.verify_reset_password.too_many_attempts;
}

export class AuthSigninAccountNotActivateException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.auth.signin.account_not_activate;
  readonly message = message.auth.signin.account_not_activate;
}

export class AuthSigninCredentialIncorrectException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.auth.signin.credential_incorrect;
  readonly message = message.auth.signin.credential_incorrect;
}

export class AuthSignupEmailExistsException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.auth.signup.email_exists;
  readonly message = message.auth.signup.email_exists;
}

export class AuthSignupMailThrottledException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.auth.signup.mail_throttled;
  readonly message = message.auth.signup.mail_throttled;
}

export class AuthSignupTooManyAttemptsException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.auth.signup.too_many_attempts;
  readonly message = message.auth.verify.too_many_attempts;
}

export class AuthSignupUsernameExistsException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.auth.signup.username_exists;
  readonly message = message.auth.signup.username_exists;
}

export class AuthVerifyAlreadyVerifiedException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.auth.verify.already_verified;
  readonly message = message.auth.verify.already_verified;
}

export class AuthVerifyInvalidOrExpiredCodeException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.auth.verify.invalid_or_expired_code;
  readonly message = message.auth.verify.invalid_or_expired_code;
}

export class AuthVerifyTooManyAttemptsException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.auth.verify.too_many_attempts;
  readonly message = message.auth.verify.too_many_attempts;
}

export class AuthVerifyResetPasswordEmailNotExistsException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.auth.verify_reset_password.email_not_exists;
  readonly message = message.auth.verify_reset_password.email_not_exists;
}

export class AuthVerifyResetPasswordInvalidOrExpiredCodeException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode =
    errorCode.auth.verify_reset_password.invalid_or_expired_code;
  readonly message = message.auth.verify_reset_password.invalid_or_expired_code;
}

export class AuthVerifyResetPasswordTooManyAttemptsException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.auth.verify_reset_password.too_many_attempts;
  readonly message = message.auth.verify_reset_password.too_many_attempts;
}
