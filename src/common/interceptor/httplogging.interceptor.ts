import {
  CallHandler,
  ExecutionContext,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { finalize, Observable } from 'rxjs';
import type { Request } from 'express';

export class HttpLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(HttpLoggingInterceptor.name);
  intercept(
    context: ExecutionContext,
    next: CallHandler<any>,
  ): Observable<any> | Promise<Observable<any>> {
    const request: Request = context.switchToHttp().getRequest();
    const handlerName: string = context.getHandler().name;
    const method: string = request.method;
    const endpoint: string = request.url;
    const ipAddress = request.ip;
    const startTime = Date.now();

    return next.handle().pipe(
      finalize(() => {
        this.logger.log({
          ipAddress: ipAddress,
          method: method,
          endpoint: endpoint,
          handlerName: handlerName,
          duration: Date.now() - startTime,
        });
      }),
    );
  }
}
