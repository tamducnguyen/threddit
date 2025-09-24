import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthUser } from './authuser.interface';
import { Request } from 'express';

export const CurrentUser = createParamDecorator(
  (
    data: keyof AuthUser | undefined,
    ctx: ExecutionContext,
  ): AuthUser | AuthUser[keyof AuthUser] | undefined => {
    const req = ctx.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const user = req.user;
    return data ? user?.[data] : user;
  },
);
