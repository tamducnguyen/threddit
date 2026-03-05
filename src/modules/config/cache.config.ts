import KeyvRedis from '@keyv/redis';
import { CacheOptions } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
export const prefixCache = {
  inforsignup: 'infosignup:',
  alreadymail: 'alreadymail:',
  verification: 'verification:',
  attemps: 'attempions:',
  deleteaccount_mail: 'deleteaccount_mail:',
  deleteaccount_code: 'deleteaccount_code:',
  deleteaccount_attemps: 'deleteaccount_attemps:',
  feedalready: 'feedalready:',
  reelalready: 'reelalready:',
};
export const ttlCache = {
  attemps: 5 * 60 * 1000,
  mail: 60 * 1000,
  info: 5 * 60 * 1000,
  code: 5 * 60 * 1000,
  ban: 5 * 60 * 1000,
  feedalready: 3 * 60 * 60 * 1000,
  reelalready: 3 * 60 * 60 * 1000,
};
export const cacheConfig = (configService: ConfigService): CacheOptions => {
  const cacheStoreUrl = configService.getOrThrow<string>('REDIS_URL');
  return { stores: [new KeyvRedis(cacheStoreUrl)] };
};
