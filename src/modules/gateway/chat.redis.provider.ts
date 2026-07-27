import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/** Injection token for the raw ioredis client used by presence tracking. */
export const CHAT_REDIS = 'CHAT_REDIS';

/**
 * A dedicated ioredis client so presence can use atomic commands
 * (INCR/DECR, SETBIT/GETBIT, BITCOUNT) that the cache-manager abstraction
 * does not expose. Shares the same REDIS_URL as the rest of the app.
 */
export const chatRedisProvider: Provider = {
  provide: CHAT_REDIS,
  inject: [ConfigService],
  useFactory: (configService: ConfigService) =>
    new Redis(configService.getOrThrow<string>('REDIS_URL')),
};
