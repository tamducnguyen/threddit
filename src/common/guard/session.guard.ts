import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { CommonTokenNotFoundException } from '../exception';
import { Request } from 'express';
import { SessionService } from '../../modules/token/session.service';
import { AuthUser } from '../../modules/token/authuser.interface';

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly sessionService: SessionService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthUser }>();
    const authHeader = request.headers?.authorization;
    if (authHeader) {
      const [scheme, sessionId] = authHeader.split(' ');
      if (/^bearer$/i.test(scheme) && sessionId) {
        request.user = await this.sessionService.validateSession(sessionId);
        return true;
      }
    }
    if (request.cookies.THREDDIT_AUTH) {
      const sessionId = request.cookies?.THREDDIT_AUTH as string;
      request.user = await this.sessionService.validateSession(sessionId);
      return true;
    }
    throw new CommonTokenNotFoundException();
  }
}
