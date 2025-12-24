import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export const AccessToken = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();

    // Ưu tiên header
    const authHeader = request.headers?.authorization;
    if (authHeader) {
      const [scheme, token] = authHeader.split(' ');
      if (/^bearer$/i.test(scheme) && token) {
        return token;
      }
    }
    if (request.cookies?.THREDDIT_AUTH) {
      return request.cookies.THREDDIT_AUTH as string;
    }

    return null;
  },
);
