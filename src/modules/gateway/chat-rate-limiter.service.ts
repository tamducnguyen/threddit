import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { CHAT_REDIS } from './chat.redis.provider';

/**
 * Fixed-window rate limiter for gateway socket events (Redis-backed, so it
 * holds under horizontal scaling — unlike `UserThrottlerGuard`, which is
 * HTTP-context-bound and in-memory, and so cannot gate WS event handlers).
 */
@Injectable()
export class ChatRateLimiterService {
  constructor(@Inject(CHAT_REDIS) private readonly redis: Redis) {}

  /** Returns `true` when the action is allowed, `false` when over the limit. */
  async checkLimit(
    event: string,
    userId: number,
    limit: number,
    windowMs: number,
  ): Promise<boolean> {
    const key = `ratelimit:${event}:${userId}`;
    const count = await this.redis.incr(key);
    if (count === 1) {
      await this.redis.pexpire(key, windowMs);
    }
    return count <= limit;
  }
}
