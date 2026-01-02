import {
  CopyObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  HeadObjectCommandOutput,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { BadRequestException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { sendResponse } from '../common/helper/response.helper';
import { message } from '../common/helper/message.helper';
import { errorCode } from '../common/helper/errorcode.helper';

@Injectable()
export class StorageService {
  private bucketName: string;
  private presignForImageExpiresInSeconds: number;
  private readonly imageContentTypes = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
  ]);
  constructor(
    private readonly s3Client: S3Client,
    private readonly configService: ConfigService,
  ) {
    this.bucketName = this.configService.getOrThrow<string>('AWS_BUCKET_NAME');
    this.presignForImageExpiresInSeconds =
      this.configService.getOrThrow<number>('PRESIGN_FOR_IMAGE_EXPIRES_IN');
  }

  async generateAvatarPresignUrl(userId: string, contentType: string) {
    // Only allow image content types for avatar uploads.
    if (!this.imageContentTypes.has(contentType)) {
      throw new BadRequestException(
        sendResponse(
          HttpStatus.BAD_REQUEST,
          message.storage.invalid_content_type,
          undefined,
          errorCode.storage.invalid_content_type,
        ),
      );
    }
    const key = `temp/avatar/${userId}`;
    const cmd = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ContentType: contentType,
    });
    const singedUrl = await getSignedUrl(this.s3Client, cmd, {
      expiresIn: this.presignForImageExpiresInSeconds,
    });
    return { singedUrl, key, bucket: this.bucketName };
  }
  async generateBackGroundImagePresignUrl(userId: string, contentType: string) {
    // Only allow image content types for background uploads.
    if (!this.imageContentTypes.has(contentType)) {
      throw new BadRequestException(
        sendResponse(
          HttpStatus.BAD_REQUEST,
          message.storage.invalid_content_type,
          undefined,
          errorCode.storage.invalid_content_type,
        ),
      );
    }
    const key = `temp/background_image/${userId}`;
    const cmd = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ContentType: contentType,
    });
    const singedUrl = await getSignedUrl(this.s3Client, cmd, {
      expiresIn: this.presignForImageExpiresInSeconds,
    });
    return { singedUrl, key, bucket: this.bucketName };
  }

  async getObjectSize(key: string) {
    // Fetch object size to enforce upload limits after client upload.
    try {
      const result = await this.s3Client.send(
        new HeadObjectCommand({ Bucket: this.bucketName, Key: key }),
      );
      return result.ContentLength;
    } catch (error) {
      const err = error as {
        $metadata?: { httpStatusCode?: number };
        name?: string;
      };
      if (err?.$metadata?.httpStatusCode == 404 || err?.name == 'NotFound') {
        return null;
      }
      throw error;
    }
  }

  async deleteObject(key: string) {
    // Remove objects that violate size limits.
    await this.s3Client.send(
      new DeleteObjectCommand({ Bucket: this.bucketName, Key: key }),
    );
  }

  async moveObject(sourceKey: string, destinationKey: string) {
    // Validate input keys.
    if (!sourceKey || !destinationKey) {
      throw new BadRequestException(
        sendResponse(
          HttpStatus.BAD_REQUEST,
          message.storage.invalid_key,
          undefined,
          errorCode.storage.invalid_key,
        ),
      );
    }

    // Ensure source exists and capture metadata for copy.
    let sourceMeta: HeadObjectCommandOutput;
    try {
      sourceMeta = await this.s3Client.send(
        new HeadObjectCommand({
          Bucket: this.bucketName,
          Key: sourceKey,
        }),
      );
    } catch (error) {
      const err = error as {
        $metadata?: { httpStatusCode?: number };
        name?: string;
      };
      if (err?.$metadata?.httpStatusCode == 404 || err?.name == 'NotFound') {
        throw new BadRequestException(
          sendResponse(
            HttpStatus.NOT_FOUND,
            message.storage.object_not_found,
            undefined,
            errorCode.storage.object_not_found,
          ),
        );
      }
      throw error;
    }

    // Copy to destination and replace metadata to preserve original values.
    await this.s3Client.send(
      new CopyObjectCommand({
        Bucket: this.bucketName,
        Key: destinationKey,
        CopySource: `${this.bucketName}/${sourceKey}`,
        MetadataDirective: 'REPLACE',
        ContentType: sourceMeta.ContentType,
        CacheControl: sourceMeta.CacheControl,
        ContentDisposition: sourceMeta.ContentDisposition,
        ContentEncoding: sourceMeta.ContentEncoding,
        ContentLanguage: sourceMeta.ContentLanguage,
        Metadata: sourceMeta.Metadata,
      }),
    );

    // Remove source after successful copy.
    await this.s3Client.send(
      new DeleteObjectCommand({ Bucket: this.bucketName, Key: sourceKey }),
    );
  }
}
