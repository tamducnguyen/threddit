import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  HeadObjectCommandOutput,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  BadRequestException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { sendResponse } from '../common/helper/response.helper';
import { message } from '../common/helper/message.helper';
import { errorCode } from '../common/helper/errorcode.helper';
import { MediaType } from '../enum/media-type.enum';
import { ALLOWED_MEDIA_CONTENT_TYPES } from './helper/media-content-types.constant';

@Injectable()
export class StorageService {
  private bucketName: string;
  private presignedUrlS3StorageExpiresIn: number;
  private readonly imageContentTypes = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
  ]);
  private readonly mediaContentTypes = new Set<string>(
    ALLOWED_MEDIA_CONTENT_TYPES,
  );
  constructor(
    private readonly s3Client: S3Client,
    private readonly configService: ConfigService,
  ) {
    this.bucketName = this.configService.getOrThrow<string>('AWS_BUCKET_NAME');
    this.presignedUrlS3StorageExpiresIn = this.configService.getOrThrow<number>(
      'PRESIGNED_URL_S3_STORAGE_EXPIRES_IN',
    );
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
      expiresIn: this.presignedUrlS3StorageExpiresIn,
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
      expiresIn: this.presignedUrlS3StorageExpiresIn,
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

  async getObjectContentType(key: string) {
    try {
      const result = await this.s3Client.send(
        new HeadObjectCommand({ Bucket: this.bucketName, Key: key }),
      );
      return result.ContentType ?? null;
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

  async getObjectHeadBytes(key: string, bytes: number = 4096) {
    try {
      const result = await this.s3Client.send(
        new GetObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          Range: `bytes=0-${Math.max(bytes - 1, 0)}`,
        }),
      );
      return await this.getBodyAsBuffer(result.Body);
    } catch (error) {
      const err = error as {
        $metadata?: { httpStatusCode?: number };
        name?: string;
      };
      if (
        err?.$metadata?.httpStatusCode == 416 ||
        err?.name == 'InvalidRange'
      ) {
        throw new NotFoundException(
          sendResponse(
            HttpStatus.NOT_FOUND,
            message.content.create_post.upload_failed,
          ),
        );
      }
      if (err?.$metadata?.httpStatusCode == 404 || err?.name == 'NotFound') {
        return null;
      }
      throw error;
    }
  }

  private async getBodyAsBuffer(body: unknown) {
    if (!body) return null;
    const bodyStream = body as {
      transformToByteArray?: () => Promise<Uint8Array>;
    };
    if (typeof bodyStream.transformToByteArray !== 'function') return null;
    const byteArray = await bodyStream.transformToByteArray();
    return Buffer.from(byteArray);
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
  async genMediaPresignedUrls(mediaContentTypes: string[], contentId: number) {
    if (!mediaContentTypes?.length) {
      throw new BadRequestException(
        sendResponse(
          HttpStatus.BAD_REQUEST,
          message.storage.invalid_content_type,
          undefined,
          errorCode.storage.invalid_content_type,
        ),
      );
    }
    for (const mediaContentType of mediaContentTypes) {
      if (!this.mediaContentTypes.has(mediaContentType)) {
        throw new BadRequestException(
          sendResponse(
            HttpStatus.BAD_REQUEST,
            message.storage.invalid_content_type,
            undefined,
            errorCode.storage.invalid_content_type,
          ),
        );
      }
    }
    const rootMediaKey = `temp/media/content/${contentId}/${contentId}-`;
    const mediaKeys: string[] = [];
    for (let i = 1; i <= mediaContentTypes.length; i++) {
      const mediaKey = rootMediaKey + i;
      mediaKeys.push(mediaKey);
    }
    const presignedMediaUrls = await Promise.all(
      mediaKeys.map((key, index) =>
        getSignedUrl(
          this.s3Client,
          new PutObjectCommand({
            Bucket: this.bucketName,
            Key: key,
            ContentType: mediaContentTypes[index],
          }),
          { expiresIn: this.presignedUrlS3StorageExpiresIn },
        ),
      ),
    );
    return { presignedMediaUrls, mediaKeys };
  }

  normalizeMimeType(rawMimeType: string): string {
    return rawMimeType.split(';')[0]?.trim().toLowerCase() ?? '';
  }

  isMimeTypeCompatible(
    declaredMimeType: string,
    detectedMimeType: string,
  ): boolean {
    if (declaredMimeType === detectedMimeType) return true;
    const mp4MimeTypes = new Set(['video/mp4', 'audio/mp4']);
    if (
      mp4MimeTypes.has(declaredMimeType) &&
      mp4MimeTypes.has(detectedMimeType)
    ) {
      return declaredMimeType === detectedMimeType;
    }
    return false;
  }

  detectMimeTypeFromMagicBytes(fileHeadBytes: Buffer): string | null {
    if (fileHeadBytes.length < 4) return null;
    if (
      fileHeadBytes[0] === 0xff &&
      fileHeadBytes[1] === 0xd8 &&
      fileHeadBytes[2] === 0xff
    ) {
      return 'image/jpeg';
    }
    if (
      fileHeadBytes.length >= 8 &&
      fileHeadBytes[0] === 0x89 &&
      fileHeadBytes[1] === 0x50 &&
      fileHeadBytes[2] === 0x4e &&
      fileHeadBytes[3] === 0x47 &&
      fileHeadBytes[4] === 0x0d &&
      fileHeadBytes[5] === 0x0a &&
      fileHeadBytes[6] === 0x1a &&
      fileHeadBytes[7] === 0x0a
    ) {
      return 'image/png';
    }
    if (
      fileHeadBytes.length >= 12 &&
      fileHeadBytes.subarray(0, 4).toString('ascii') === 'RIFF' &&
      fileHeadBytes.subarray(8, 12).toString('ascii') === 'WEBP'
    ) {
      return 'image/webp';
    }
    if (
      fileHeadBytes.length >= 6 &&
      (fileHeadBytes.subarray(0, 6).toString('ascii') === 'GIF87a' ||
        fileHeadBytes.subarray(0, 6).toString('ascii') === 'GIF89a')
    ) {
      return 'image/gif';
    }
    if (
      fileHeadBytes.length >= 12 &&
      fileHeadBytes.subarray(4, 8).toString('ascii') === 'ftyp'
    ) {
      const majorBrand = fileHeadBytes.subarray(8, 12).toString('ascii');
      const lowerMajorBrand = majorBrand.toLowerCase();
      if (majorBrand === 'qt  ') return 'video/quicktime';
      if (lowerMajorBrand.startsWith('m4a')) return 'audio/mp4';
      return 'video/mp4';
    }
    if (
      fileHeadBytes.length >= 12 &&
      fileHeadBytes.subarray(0, 4).toString('ascii') === 'RIFF' &&
      fileHeadBytes.subarray(8, 12).toString('ascii') === 'AVI '
    ) {
      return 'video/x-msvideo';
    }
    if (
      fileHeadBytes.length >= 4 &&
      fileHeadBytes[0] === 0x1a &&
      fileHeadBytes[1] === 0x45 &&
      fileHeadBytes[2] === 0xdf &&
      fileHeadBytes[3] === 0xa3
    ) {
      const lowerText = fileHeadBytes.toString('ascii').toLowerCase();
      if (lowerText.includes('webm')) return 'video/webm';
      return 'video/x-matroska';
    }
    if (
      fileHeadBytes.length >= 4 &&
      fileHeadBytes.subarray(0, 4).toString('ascii') === 'OggS'
    ) {
      return 'audio/ogg';
    }
    if (
      fileHeadBytes.length >= 12 &&
      fileHeadBytes.subarray(0, 4).toString('ascii') === 'RIFF' &&
      fileHeadBytes.subarray(8, 12).toString('ascii') === 'WAVE'
    ) {
      return 'audio/wav';
    }
    if (
      fileHeadBytes.length >= 3 &&
      fileHeadBytes.subarray(0, 3).toString('ascii') === 'ID3'
    ) {
      return 'audio/mpeg';
    }
    if (
      fileHeadBytes.length >= 2 &&
      fileHeadBytes[0] === 0xff &&
      (fileHeadBytes[1] === 0xf1 || fileHeadBytes[1] === 0xf9)
    ) {
      return 'audio/aac';
    }
    if (
      fileHeadBytes.length >= 2 &&
      fileHeadBytes[0] === 0xff &&
      (fileHeadBytes[1] & 0xe0) === 0xe0
    ) {
      return 'audio/mpeg';
    }
    return null;
  }

  getMediaTypeFromMimeType(mimeType: string): MediaType {
    if (mimeType.startsWith('image/')) return MediaType.IMAGE;
    if (mimeType.startsWith('video/')) return MediaType.VIDEO;
    if (mimeType.startsWith('audio/')) return MediaType.AUDIO;
    throw new BadRequestException(
      message.content.create_post.invalid_media_key,
    );
  }

  isAllowedMediaContentType(mimeType: string): boolean {
    return this.mediaContentTypes.has(mimeType);
  }
}
