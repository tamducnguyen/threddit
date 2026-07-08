import { S3Client } from '@aws-sdk/client-s3';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageService } from './storage.service';
import { StorageController } from './storage.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SessionEntity } from '../../entities/session.entity';
import { UserEntity } from '../../entities/user.entity';
import { ContentEntity } from '../../entities/content.entity';
import { MediaFileEntity } from '../../entities/media-file.entity';
import { SessionModule } from '../token/session.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SessionEntity,
      UserEntity,
      ContentEntity,
      MediaFileEntity,
    ]),
    SessionModule,
  ],
  providers: [
    {
      provide: S3Client,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const region = config.getOrThrow<string>('AWS_REGION');
        return new S3Client({
          region,
          credentials: {
            accessKeyId: config.getOrThrow<string>('AWS_ACCESS_KEY'),
            secretAccessKey: config.getOrThrow<string>('AWS_SECRET_KEY'),
          },
        });
      },
    },
    StorageService,
  ],
  controllers: [StorageController],
  exports: [StorageService],
})
export class StorageModule {}
