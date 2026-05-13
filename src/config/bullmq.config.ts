import { BullRootModuleOptions } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';

export const bullMqConfig = (
  configService: ConfigService,
): BullRootModuleOptions => ({
  connection: {
    url: configService.getOrThrow<string>('REDIS_URL'),
  },
  prefix: configService.getOrThrow<string>('PREFIX_BULLMQ'),
  defaultJobOptions: {
    attempts: Number(configService.getOrThrow<number>('ATTEMPTS_NUMBER')),
    backoff: {
      type: configService.getOrThrow<'exponential' | 'fixed'>('BACKOFF_TYPE'),
      delay: Number(configService.getOrThrow<number>('DELAY_TIME_JOB')),
    },
    removeOnComplete: {
      age: Number(configService.getOrThrow<number>('REMOVE_AFTER_TIME')),
      count: Number(configService.getOrThrow<number>('REMOVE_AFTER_COUNT')),
    },
    removeOnFail:
      configService.getOrThrow<string>('REMOVE_ONFAIL') === 'true'
        ? true
        : false,
  },
});
