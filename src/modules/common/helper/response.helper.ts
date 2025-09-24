import { HttpStatus } from '@nestjs/common';

export function sendResponse<T>(
  statusCode: HttpStatus,
  message: string,
  data?: T,
) {
  return { statusCode, message, data };
}
