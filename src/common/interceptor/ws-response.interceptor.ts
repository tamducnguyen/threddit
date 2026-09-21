import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { RESPONSE_MESSAGE } from '../decorator/response-message.decorator';
import { sendWsResponse } from '../helper/response.helper';

@Injectable()
export class WsResponseInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const handler = context.getHandler();
    const message = this.reflector.get<string>(RESPONSE_MESSAGE, handler);
    // Routes without @ResponseMessage (e.g. @Sse streams) are passed through untouched.
    if (!message) {
      return next.handle();
    }

    return next.handle().pipe(
      map((result: unknown) => {
        return sendWsResponse(true, message, result);
      }),
    );
  }
}
