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
  async validateTokenAndUser(token: string) {
    const validateInfo = await this.sessionRepository.findOne({
      where: { token: token },
      select: {
        id: true,
        isRevoked: true,
        user: { isActivate: true },
      },
      relations: { user: true },
    });
    if (!validateInfo) {
      throw new UnauthorizedException(message.common.token_not_found);
    }
    if (validateInfo.isRevoked != false) {
      throw new UnauthorizedException(message.common.session_revoked);
    }
    if (validateInfo.user.isActivate != true) {
      throw new UnauthorizedException(message.common.account_not_activate);
    }
  }
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers?.authorization;
    if (authHeader) {
      const [scheme, token] = authHeader.split(' ');
      if (/^bearer$/i.test(scheme) && token) {
        await this.validateTokenAndUser(token);
        return true;
      }
    }
    if (request.cookies.THREDDIT_AUTH) {
      const token = request.cookies?.THREDDIT_AUTH as string;
      await this.validateTokenAndUser(token);
      return true;
    }
    throw new UnauthorizedException(message.common.token_not_found);
  }
}
