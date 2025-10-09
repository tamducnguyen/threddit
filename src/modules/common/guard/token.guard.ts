import {
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { message } from '../helper/message.helper';
import { InjectRepository } from '@nestjs/typeorm';
import { SessionEntity } from 'src/modules/entities/session.entity';
import { Repository } from 'typeorm';
export class TokenGuard implements CanActivate {
  constructor(
    @InjectRepository(SessionEntity)
    private readonly sessionRepository: Repository<SessionEntity>,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers?.authorization;
    if (authHeader) {
      const [scheme, token] = authHeader.split(' ');
      if (/^bearer$/i.test(scheme) && token) {
        const isRevoked = await this.sessionRepository.exists({
          where: { token: token, isRevoked: true },
        });
        if (isRevoked) {
          throw new UnauthorizedException(message.common.session_revoked);
        }
        return true;
      }
    }
    if (request.cookies.accessToken) {
      const token = request.cookies?.accessToken as string;
      const isRevoked = await this.sessionRepository.exists({
        where: { token: token, isRevoked: true },
      });
      if (isRevoked) {
        throw new UnauthorizedException(message.common.session_revoked);
      }
      return true;
    }
    throw new UnauthorizedException(message.common.token_not_found);
  }
}
