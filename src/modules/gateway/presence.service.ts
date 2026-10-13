import { Inject, Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { UserPresence } from './interfaces/user-presence.interface';
import {
  CONN_TTL_SECONDS,
  connKey,
  lastSeenKey,
  ONLINE_BITMAP_KEY,
} from './constants/key.constant';
import { REDIS_PROVIDER } from './constants/provider.constant';

@Injectable()
export class PresenceService {
  private readonly logger: Logger;

  constructor(@Inject(REDIS_PROVIDER) private readonly redis: Redis) {
    this.logger = new Logger(PresenceService.name);
  }
  /**
   * Register a newly connected socket for `userId`.
   * @returns `true` when this connection transitioned the user 0 → 1 (i.e. the
   * user just came online), so the caller can broadcast the transition once.
   */
  async addConnection(userId: number): Promise<boolean> {
    const key = connKey(userId);
    const count = await this.redis.incr(key);
    await this.redis.expire(key, CONN_TTL_SECONDS);
    if (count === 1) {
      this.logger.log(`userId: ${userId} online`);
      await this.redis.setbit(ONLINE_BITMAP_KEY, userId, 1);
      return true;
    }
    this.logger.log(`userId: ${userId} new connection: ${count}`);
    return false;
  }

  /**
   * Keep a user's connection counter alive while at least one socket is open.
   * Called on each Socket.IO heartbeat; a no-op when the key has already gone.
   */
  async refreshConnection(userId: number): Promise<void> {
    await this.redis.expire(connKey(userId), CONN_TTL_SECONDS);
  }

  /**
   * Deregister a disconnected socket for `userId`.
   * @returns `becameOffline: true` with the recorded `lastSeen` when this was
   * the user's last socket (1 → 0), so the caller can broadcast the transition.
   */
  async removeConnection(
    userId: number,
  ): Promise<{ becameOffline: boolean; lastSeen: number | null }> {
    const key = connKey(userId);
    const count = await this.redis.decr(key);
    this.logger.log(`remove connection userId: ${userId} `);
    if (count <= 0) {
      const lastSeen = Date.now();
      this.logger.log(`userId: ${userId} offline`);
      await this.redis
        .multi()
        .del(key)
        .set(lastSeenKey(userId), lastSeen)
        .setbit(ONLINE_BITMAP_KEY, userId, 0)
        .exec();
      return { becameOffline: true, lastSeen };
    }
    // Other sockets remain; keep the counter from expiring under them.
    await this.redis.expire(key, CONN_TTL_SECONDS);
    return { becameOffline: false, lastSeen: null };
  }

  /**
   * Resolve the current presence of a set of users in a single round-trip.
   * Used for snapshots when a client connects and missed live transitions.
   */
  async getPresence(userIds: number[]): Promise<UserPresence[]> {
    if (userIds.length === 0) return [];

    const pipeline = this.redis.pipeline();
    for (const userId of userIds) {
      pipeline.getbit(ONLINE_BITMAP_KEY, userId);
      pipeline.get(lastSeenKey(userId));
    }
    const results = await pipeline.exec();

    return userIds.map((userId, index) => {
      const onlineBit = results?.[index * 2]?.[1] as number;
      const lastSeenRaw = results?.[index * 2 + 1]?.[1] as string;
      return {
        userId,
        isOnline: onlineBit === 1,
        lastSeen: lastSeenRaw != null ? Number(lastSeenRaw) : null,
      };
    });
  }

  /** Total number of users currently online across the system. */
  async getOnlineCount(): Promise<number> {
    return await this.redis.bitcount(ONLINE_BITMAP_KEY);
  }
}
