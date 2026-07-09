import { HttpStatus } from '@nestjs/common';
import { BaseServiceException } from './base-service.exception';
import { message } from '../helper/message.helper';
import { errorCode } from '../helper/errorcode.helper';

export class StorageContentNotFoundException extends BaseServiceException {
  readonly statusCode = HttpStatus.NOT_FOUND;
  readonly errorCode = errorCode.storage.content_not_found;
  readonly message = message.storage.content_not_found;
}

export class StorageInvalidContentTypeException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.storage.invalid_content_type;
  readonly message = message.storage.invalid_content_type;
}

export class StorageInvalidKeyException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.storage.invalid_key;
  readonly message = message.storage.invalid_key;
}

export class StorageInvalidMediaContentTypeException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.storage.invalid_media_content_type;
  readonly message = message.storage.invalid_media_content_type;
}

export class StorageInvalidMediaFileNumberException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.storage.invalid_media_file_number;
  readonly message = message.storage.invalid_media_file_number;
}

export class StorageInvalidMediaKeyException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.storage.invalid_media_key;
  readonly message = message.storage.invalid_media_key;
}

export class StorageInvalidUploadSessionIdException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.storage.invalid_upload_session_id;
  readonly message = message.storage.invalid_upload_session_id;
}

export class StorageMediaFileTooLargeException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.storage.media_file_too_large;
  readonly message = message.storage.media_file_too_large;
}

export class StorageObjectNotFoundException extends BaseServiceException {
  readonly statusCode = HttpStatus.NOT_FOUND;
  readonly errorCode = errorCode.storage.object_not_found;
  readonly message = message.storage.object_not_found;
}

export class StorageStoryMustHaveOneMediaException extends BaseServiceException {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = errorCode.storage.story_must_have_one_media;
  readonly message = message.storage.story_must_have_one_media;
}

export class StorageUploadFailedException extends BaseServiceException {
  readonly statusCode = HttpStatus.NOT_FOUND;
  readonly errorCode = errorCode.storage.upload_failed;
  readonly message = message.storage.upload_failed;
}
