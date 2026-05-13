import { HttpModuleOptions } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';

export const HttpModuleConfig = (
  configService: ConfigService,
): HttpModuleOptions => ({
  timeout: configService.getOrThrow<number>('TIME_OUT'),
});
