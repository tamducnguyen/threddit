import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { CHAT_REDIS } from './chat.redis.provider';
import { UserPresence } from './interfaces/user-presence.interface';

// Per-user count of currently open sockets. The source of truth for whether a
// user is online; ref-counted so multiple tabs/devices don't flip each other.
const connKey = (userId: number) => `presence:conn:${userId}`;
// Epoch-ms timestamp written when a user's last socket disconnects.
const lastSeenKey = (userId: number) => `presence:lastseen:${userId}`;
// Derived index: bit `userId` is set while the user is online. Lets a single
// BITCOUNT return the global online total cheaply.
const ONLINE_BITMAP_KEY = 'presence:online';

// Safety net so a crashed server's connection counters self-expire instead of
// pinning users online forever. Comfortably exceeds Socket.IO's heartbeat
// window (pingInterval + pingTimeout), and is refreshed on every heartbeat, so
// it only lapses once the socket is genuinely gone.
const CONN_TTL_SECONDS = 90;

@Injectable()
export class PresenceService {
  constructor(@Inject(CHAT_REDIS) private readonly redis: Redis) {}

  /**
   * Register a newly connected socket for `userId`.
   * @returns `true` when this connection transitioned the user 0 → 1 (i.e. the
   * user just came online), so the caller can broadcast the transition once.
   */
  async addConnection(userId: number): Promise<boolean> {
    const key = connKey(userId);
    const count = await this.redis.incr(key);
    await this.redis.expire(key, CONN_TTL_SECONDS);
    console.log(
      `[Presence] addConnection userId=${userId} connections=${count}${count === 1 ? ' (ONLINE)' : ''}`,
    );
    if (count === 1) {
      await this.redis.setbit(ONLINE_BITMAP_KEY, userId, 1);
      return true;
    }
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
    console.log(
      `[Presence] removeConnection userId=${userId} connections=${Math.max(count, 0)}${count <= 0 ? ' (OFFLINE)' : ''}`,
    );
    if (count <= 0) {
      const lastSeen = Date.now();
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
      const onlineBit = results?.[index * 2]?.[1] as number | undefined;
      const lastSeenRaw = results?.[index * 2 + 1]?.[1] as
        | string
        | null
        | undefined;
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
