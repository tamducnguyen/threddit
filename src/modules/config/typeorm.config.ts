import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import * as path from 'path';

export const typeORMConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => ({
  type: 'postgres',
  url: configService.getOrThrow<string>('DB_URL'),
  // logging: ['error', 'warn', 'query'],
  synchronize: true,
  entities: [path.join(__dirname, '..', 'entities', '*.entity{.ts,.js}')],
});
