import { randomBytes } from 'node:crypto';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  HttpStatus,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cache } from 'cache-manager';
import { Repository } from 'typeorm';
import { prefixCache, ttlCache } from '../../config/cache.config';
import { SessionEntity } from '../../entities/session.entity';
import { UserEntity } from '../../entities/user.entity';
import { errorCode } from '../../common/helper/errorcode.helper';
import { message } from '../../common/helper/message.helper';
import { sendResponse } from '../../common/helper/response.helper';
import { AuthUser } from './authuser.interface';

interface SessionCacheEntry {
  sub: number;
  isRevoked: boolean;
}

@Injectable()
export class SessionService {
  constructor(
    @InjectRepository(SessionEntity)
    private readonly sessionRepository: Repository<SessionEntity>,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  /**
   * Create an opaque session id for the user, persist it in the sessions
   * table and prime the cache entry.
   * @param user
   * @returns the generated session id
   */
  async createSession(user: UserEntity): Promise<string> {
    const sessionId = randomBytes(32).toString('hex');
    await this.sessionRepository.save({ user, token: sessionId });
    await this.cacheManager.set<SessionCacheEntry>(
      prefixCache.session + sessionId,
      { sub: user.id, isRevoked: false },
      ttlCache.session,
    );
    return sessionId;
  }

  /**
   * Validate a session id: cache first (sliding TTL on hit), fall back to the
   * sessions table on miss and re-populate the cache.
   * @param sessionId
   * @returns the authenticated user payload
   */
  async validateSession(sessionId: string): Promise<AuthUser> {
    const cacheKey = prefixCache.session + sessionId;
    const cached = await this.cacheManager.get<SessionCacheEntry>(cacheKey);
    if (cached) {
      if (cached.isRevoked) {
        throw new UnauthorizedException(
          sendResponse(
            HttpStatus.UNAUTHORIZED,
            message.common.session_revoked,
            undefined,
            errorCode.common.session_revoked,
          ),
        );
      }
      //extend ttl on hit
      await this.cacheManager.set<SessionCacheEntry>(
        cacheKey,
        cached,
        ttlCache.session,
      );
      return new AuthUser(cached.sub);
    }
    const sessionFound = await this.sessionRepository.findOne({
      where: { token: sessionId },
      select: {
        id: true,
        isRevoked: true,
        user: { id: true, isActivate: true },
      },
      relations: { user: true },
    });
    if (!sessionFound) {
      throw new UnauthorizedException(
        sendResponse(
          HttpStatus.UNAUTHORIZED,
          message.common.token_not_found,
          undefined,
          errorCode.common.token_not_found,
        ),
      );
    }
    if (sessionFound.isRevoked != false) {
      await this.cacheManager.set<SessionCacheEntry>(
        cacheKey,
        { sub: sessionFound.user.id, isRevoked: true },
        ttlCache.session,
      );
      throw new UnauthorizedException(
        sendResponse(
          HttpStatus.UNAUTHORIZED,
          message.common.session_revoked,
          undefined,
          errorCode.common.session_revoked,
        ),
      );
    }
    if (sessionFound.user.isActivate != true) {
      throw new UnauthorizedException(
        sendResponse(
          HttpStatus.UNAUTHORIZED,
          message.common.account_not_activate,
          undefined,
          errorCode.common.account_not_activate,
        ),
      );
    }
    await this.cacheManager.set<SessionCacheEntry>(
      cacheKey,
      { sub: sessionFound.user.id, isRevoked: false },
      ttlCache.session,
    );
    return new AuthUser(sessionFound.user.id);
  }

  /**
   * Mark one session as revoked in the cache (call AFTER the DB write).
   * @param sessionId
   * @param userId
   */
  async revokeSessionCache(sessionId: string, userId: number): Promise<void> {
    await this.cacheManager.set<SessionCacheEntry>(
      prefixCache.session + sessionId,
      { sub: userId, isRevoked: true },
      ttlCache.session,
    );
  }

  /**
   * List every session id of a user (call BEFORE a revoke-all transaction,
   * the rows may be gone afterwards).
   * @param userId
   */
  async getSessionTokensOfUser(userId: number): Promise<string[]> {
    const sessions = await this.sessionRepository.find({
      where: { user: { id: userId } },
      select: { id: true, token: true },
    });
    return sessions.map((session) => session.token);
  }

  /**
   * Mark many sessions as revoked in the cache (call AFTER the DB write).
   * @param sessionIds
   * @param userId
   */
  async revokeSessionCaches(
    sessionIds: string[],
    userId: number,
  ): Promise<void> {
    await Promise.all(
      sessionIds.map((sessionId) => this.revokeSessionCache(sessionId, userId)),
    );
  }
}
