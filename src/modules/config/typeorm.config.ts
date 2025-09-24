import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const typeORMConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => ({
  type: 'postgres',
  url: configService.getOrThrow<string>('DB_URL'),
  ssl: configService.getOrThrow<boolean>('DB_SSL')
    ? { rejectUnauthorized: false }
    : false,
  // logging: ['error', 'warn', 'query'],
  synchronize: process.env.NODE_ENV === 'development' ? true : false,
  autoLoadEntities: true,
});
