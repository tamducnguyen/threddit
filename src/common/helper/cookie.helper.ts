import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
export function sendCookie(
  res: Response,
  configService: ConfigService,
  name: string,
  value: any,
) {
  res.cookie(name, value, {
    httpOnly:
      configService.getOrThrow<string>('COOKIE_HTTPONLY') === 'true'
        ? true
        : false,
    secure:
      configService.getOrThrow<string>('COOKIE_SECURE') === 'true'
        ? true
        : false,
    sameSite: configService.getOrThrow<'lax' | 'strict' | 'none'>(
      'COOKIE_SAMESITE',
    ),
    maxAge: configService.getOrThrow<number>('COOKIE_MAXAGE'),
  });
}
export const cookieOptions = {
  name: {
    THREDDIT_AUTH: 'THREDDIT_AUTH',
  },
};
