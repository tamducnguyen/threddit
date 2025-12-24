import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthUser } from './authuser.interface';
import { Request } from 'express';
function cookieExtractor(req: Request): string {
  return req?.cookies?.THREDDIT_AUTH as string;
}
@Injectable()
export class JwtAccessStrategy extends PassportStrategy(Strategy) {
  constructor(private configureService: ConfigService) {
    const secret = configureService.get<string>('SECRET');
    if (!secret) {
      throw new Error('Secret not found');
    }
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        cookieExtractor,
      ]),
      secretOrKey: secret,
    });
  }

  validate(authUser: AuthUser) {
    return authUser;
  }
}
