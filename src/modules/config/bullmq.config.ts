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
    attempts: configService.getOrThrow<number>('ATTEMPTS_NUMBER'),
    backoff: {
      type: configService.getOrThrow<'exponential' | 'fixed'>('BACKOFF_TYPE'),
      delay: configService.getOrThrow<number>('DELAY_TIME_JOB'),
    },
    removeOnComplete: {
      age: configService.getOrThrow<number>('REMOVE_AFTER_TIME'),
      count: configService.getOrThrow<number>('REMOVE_AFTER_COUNT'),
    },
    removeOnFail: configService.getOrThrow<boolean>('REMOVE_ONFAIL'),
  },
});
