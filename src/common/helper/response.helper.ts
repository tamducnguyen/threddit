import { HttpStatus } from '@nestjs/common';

export function sendResponse<T>(
  statusCode: HttpStatus,
  message: string,
  data?: T,
  errorCode?: string,
) {
  return {
    statusCode,
    message,
    data,
    ...(errorCode ? { errorCode } : {}),
  };
}
