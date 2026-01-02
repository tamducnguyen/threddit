import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { typeORMConfig } from './modules/config/typeorm.config';
import { CacheModule } from '@nestjs/cache-manager';
import { ThrottlerModule } from '@nestjs/throttler';
import { throttlerConfig } from './modules/config/throttler.config';
import { AccountModule } from './modules/account/account.module';
// import { NotificationModule } from './modules/notification/notification.module';
// import { FollowModule } from './modules/follow/follow.module';
// import { PostModule } from './modules/post/post.module';
import { BullModule } from '@nestjs/bullmq';
import { bullMqConfig } from './modules/config/bullmq.config';
import { ApiKeyGuard } from './modules/common/guard/apikey.guard';
import { APP_GUARD } from '@nestjs/core';
import { cacheConfig } from './modules/config/cache.config';
import { ProfileModule } from './modules/profile/profile.module';

@Module({
  imports: [
    AuthModule,
    AccountModule,
    // NotificationModule,
    // FollowModule,
    // PostModule,
    ProfileModule,
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: throttlerConfig,
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [`.env.${process.env.NODE_ENV}`],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: typeORMConfig,
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: cacheConfig,
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: bullMqConfig,
    }),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ApiKeyGuard,
    },
  ],
})
export class AppModule {}
