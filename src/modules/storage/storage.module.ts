import { S3Client } from '@aws-sdk/client-s3';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageService } from './storage.service';

@Module({
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
  exports: [StorageService],
})
export class StorageModule {}
