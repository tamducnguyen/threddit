import { ConfigService } from '@nestjs/config';
import { ThrottlerModuleOptions } from '@nestjs/throttler';

export const throttlerConfig = (
  configService: ConfigService,
): ThrottlerModuleOptions => [
  {
    name: 'read',
    ttl: 60_000,
    limit: configService.getOrThrow<number>('LIMIT_READ'),
  },
  {
    name: 'write',
    ttl: 60_000,
    limit: configService.getOrThrow<number>('LIMIT_WRITE'),
  },
  {
    name: 'public',
    ttl: 60_000,
    limit: configService.getOrThrow<number>('LIMIT_PUBLIC'),
  },
];
