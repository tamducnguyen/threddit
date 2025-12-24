import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import * as path from 'path';

export const typeORMConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => ({
  type: 'postgres',
  url: configService.getOrThrow<string>('DB_URL'),
  // logging: ['error', 'warn', 'query'],
  synchronize: process.env.NODE_ENV === 'development' ? true : false,
  entities: [path.join(__dirname, '..', 'entities', '*.entity{.ts,.js}')],
});
