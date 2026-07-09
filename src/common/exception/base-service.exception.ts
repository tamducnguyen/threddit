import { HttpStatus } from '@nestjs/common';

export abstract class BaseServiceException extends Error {
  abstract readonly statusCode: HttpStatus;
  abstract readonly errorCode?: string;
}

export type ServiceExceptionClass = new () => BaseServiceException;
