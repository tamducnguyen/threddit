import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { BaseServiceException } from '../exception/base-service.exception';
import { sendResponse } from '../helper/response.helper';

@Catch()
export class ServiceExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ServiceExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();

    if (exception instanceof BaseServiceException) {
      response
        .status(exception.statusCode)
        .json(
          sendResponse(
            exception.statusCode,
            exception.message,
            undefined,
            exception.errorCode,
          ),
        );
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const bodyMessage =
        body && typeof body === 'object' && 'message' in body
          ? (body as { message: string | string[] }).message
          : exception.message;
      response.status(status).json(sendResponse(status, bodyMessage));
      return;
    }

    this.logger.error(
      exception instanceof Error ? exception.stack : String(exception),
    );
    response
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json(
        sendResponse(HttpStatus.INTERNAL_SERVER_ERROR, 'Internal server error'),
      );
  }
}
