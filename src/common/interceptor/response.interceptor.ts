import {
  CallHandler,
  ExecutionContext,
  HttpStatus,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { HTTP_CODE_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { RESPONSE_MESSAGE } from '../decorator/response-message.decorator';
import { sendResponse } from '../helper/response.helper';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const handler = context.getHandler();
    const messages = this.reflector.get<Record<string, string>>(
      RESPONSE_MESSAGE,
      handler,
    );
    // Routes without @ResponseMessage (e.g. @Sse streams) are passed through untouched.
    if (!messages) {
      return next.handle();
    }
    const statusCode =
      this.reflector.get<number>(HTTP_CODE_METADATA, handler) ?? HttpStatus.OK;

    return next.handle().pipe(
      map((result: unknown) => {
        const isUnion =
          !!result &&
          typeof result === 'object' &&
          'kind' in (result as Record<string, unknown>);
        const kind = isUnion ? (result as { kind: string }).kind : 'success';
        const data = isUnion ? (result as { data?: unknown }).data : result;
        return sendResponse(statusCode, messages[kind], data);
      }),
    );
  }
}
