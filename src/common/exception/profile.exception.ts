import { HttpStatus } from '@nestjs/common';
import { BaseServiceException } from './base-service.exception';
import { message } from '../helper/message.helper';
import { errorCode } from '../helper/errorcode.helper';

export class ProfileGetProfileUserNotFoundException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.profile.get_profile.user_not_found;
  readonly message = message.profile.get_profile.user_not_found;
}

export class ProfileSearchProfileCursorInvalidException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.profile.search_profile.cursor_invalid;
  readonly message = message.profile.search_profile.cursor_invalid;
}

export class ProfileUpdateAvatarInvalidKeyException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.profile.update_avatar.invalid_key;
  readonly message = message.profile.update_avatar.invalid_key;
}

export class ProfileUpdateAvatarInvalidSizeException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.profile.update_avatar.invalid_size;
  readonly message = message.profile.update_avatar.invalid_size;
}

export class ProfileUpdateAvatarUploadNotFoundException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.profile.update_avatar.upload_not_found;
  readonly message = message.profile.update_avatar.upload_not_found;
}

export class ProfileUpdateAvatarUploadTooLargeException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.profile.update_avatar.upload_too_large;
  readonly message = message.profile.update_avatar.upload_too_large;
}

export class ProfileUpdateBackgroundInvalidKeyException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.profile.update_background.invalid_key;
  readonly message = message.profile.update_background.invalid_key;
}

export class ProfileUpdateBackgroundInvalidSizeException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.profile.update_background.invalid_size;
  readonly message = message.profile.update_background.invalid_size;
}

export class ProfileUpdateBackgroundUploadNotFoundException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.profile.update_background.upload_not_found;
  readonly message = message.profile.update_background.upload_not_found;
}

export class ProfileUpdateBackgroundUploadTooLargeException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.profile.update_background.upload_too_large;
  readonly message = message.profile.update_background.upload_too_large;
}

export class ProfileUpdateProfileNoFieldToUpdateException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.profile.update_profile.no_field_to_update;
  readonly message = message.profile.update_profile.no_field_to_update;
}

export class ProfileUpdateProfileUserNotFoundException extends BaseServiceException {
  readonly statusCode = HttpStatus.NOT_FOUND;
  readonly errorCode = errorCode.profile.update_profile.user_not_found;
  readonly message = message.profile.update_profile.user_not_found;
}
