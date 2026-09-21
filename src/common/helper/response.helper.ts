import { HttpStatus } from '@nestjs/common';

export function sendResponse<T>(
  statusCode: HttpStatus,
  message: string | string[],
  data?: T,
  errorCode?: string,
) {
  return {
    success: Number(statusCode) >= 200 && Number(statusCode) < 300,
    message,
    data,
    errorCode,
    timestamp: new Date().toISOString(),
  };
}
export function sendWsResponse<T>(
  success: boolean,
  message: string | string[],
  data?: T,
  errorCode?: string,
) {
  return {
    success,
    message,
    data,
    errorCode,
    timestamp: new Date().toISOString(),
  };
}
