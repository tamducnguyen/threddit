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
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { sendResponse } from '../common/helper/response.helper';
import { message } from '../common/helper/message.helper';
import { errorCode } from '../common/helper/errorcode.helper';
import { MediaType } from '../enum/media-type.enum';
import { ALLOWED_MEDIA_CONTENT_TYPES } from './helper/media-content-types.constant';
import type { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { randomUUID } from 'crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../entities/user.entity';
import { ContentEntity } from '../entities/content.entity';
import { MediaFileEntity } from '../entities/media-file.entity';
import { MediaTargetType } from '../enum/media-target-type.enum';
import { ContentType } from '../enum/contenttype.enum';

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
  private readonly maxMediaFileSizeInBytes: number;
  constructor(
    private readonly s3Client: S3Client,
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(ContentEntity)
    private readonly contentRepo: Repository<ContentEntity>,
    @InjectRepository(MediaFileEntity)
    private readonly mediaFileRepo: Repository<MediaFileEntity>,
  ) {
    this.bucketName = this.configService.getOrThrow<string>('AWS_BUCKET_NAME');
    this.presignedUrlS3StorageExpiresIn = this.configService.getOrThrow<number>(
      'PRESIGNED_URL_S3_STORAGE_EXPIRES_IN',
    );
    this.maxMediaFileSizeInBytes = this.configService.getOrThrow<number>(
      'MAX_MEDIA_SIZE_IN_BYTES',
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
            message.storage.upload_failed,
            undefined,
            errorCode.storage.upload_failed,
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
  /**
   * Generates upload presigned URLs for media files of a specific owner and upload session id.
   *
   * Key format:
   * - `temp/media/content/{ownerUserId}/{sortOrder}`
   *
   * @param mediaFilesNumber Number of media files to upload.
   * @param ownerUserId Owner user id used to build object keys.
   * @returns A list of presigned upload URLs ordered by `sortOrder` and upload session id.
   */
  async genMediaPresignedUrls(mediaFilesNumber: number, ownerUserId: number) {
    // Validate input shape.
    if (
      !Number.isInteger(mediaFilesNumber) ||
      mediaFilesNumber <= 0 ||
      !Number.isInteger(ownerUserId) ||
      ownerUserId <= 0
    ) {
      throw new Error();
    }

    // Create a unique upload session id to map uploaded keys in cache.
    const uploadSessionId = randomUUID();

    // Build deterministic object keys by owner id and sort order.
    const mediaKeys = Array.from(
      { length: mediaFilesNumber },
      (_, index) => `temp/media/${ownerUserId}/${uploadSessionId}/${index + 1}`,
    );

    // Generate one upload URL for each media key.
    const presignedMediaUrls = await Promise.all(
      mediaKeys.map((mediaKey) =>
        getSignedUrl(
          this.s3Client,
          new PutObjectCommand({
            Bucket: this.bucketName,
            Key: mediaKey,
          }),
          { expiresIn: this.presignedUrlS3StorageExpiresIn },
        ),
      ),
    );

    // Cache media keys by upload session id so confirm step can resolve them later.
    const MAX_UPLOAD_TIME_BY_MS = this.configService.getOrThrow<number>(
      'MAX_UPLOAD_TIME_BY_MS',
    );
    await this.cacheManager.set(
      uploadSessionId,
      mediaKeys,
      MAX_UPLOAD_TIME_BY_MS,
    );

    // Return upload urls with upload session id to the client.
    return sendResponse(HttpStatus.OK, message.storage.request_upload_success, {
      presignedMediaUrls,
      uploadSessionId,
    });
  }
  /**
   * Generates presigned upload URLs for appending media to an existing content.
   *
   * Flow:
   * - validate `mediaFilesNumber` request input
   * - load content and current user in parallel
   * - validate content/user existence and author ownership
   * - load current media list and compute next sort order
   * - generate new temporary media keys and presigned URLs
   * - cache new keys by upload session id for later confirm step
   * - return upload session id, presigned URLs, and media keys (old + new)
   *
   * @param currentUserId Current authenticated user id.
   * @param contentId Target content id.
   * @param mediaFilesNumber Number of new media files to upload.
   * @returns Standard response with:
   * - `uploadSessionId`: upload batch identifier
   * - `presignedUrls`: presigned upload URLs for new media keys
   * - `mediaKeys`: existing persisted keys + newly generated temp keys
   * @throws BadRequestException When media file number is invalid.
   * @throws NotFoundException When content/user does not exist or user is not content author.
   */
  async genUpdateMediaPresignedUrls(
    currentUserId: number,
    contentId: number,
    mediaFilesNumber: number,
  ) {
    // Validate requested number of new media files.
    if (!Number.isInteger(mediaFilesNumber) || mediaFilesNumber <= 0) {
      throw new BadRequestException(
        sendResponse(
          HttpStatus.BAD_REQUEST,
          message.storage.invalid_media_file_number,
          undefined,
          errorCode.storage.invalid_media_file_number,
        ),
      );
    }

    // Load content and current user in parallel to reduce latency.
    const content = await this.contentRepo.findOne({
      where: { id: contentId },
      relations: { author: true, mentionedUsers: true },
    });

    // Reject when target content does not exist.
    if (!content || content.author.id !== currentUserId) {
      throw new NotFoundException(
        sendResponse(
          HttpStatus.NOT_FOUND,
          message.storage.content_not_found,
          undefined,
          errorCode.storage.content_not_found,
        ),
      );
    }

    // Fetch existing media list and keep deterministic order by sort order.
    const existingMediaFiles = await this.mediaFileRepo.find({
      where: {
        targetType: MediaTargetType.CONTENT,
        targetId: contentId,
      },
      order: { sortOrder: 'ASC' },
    });

    // Enforce story rule: a story can contain at most one media file.
    if (content.type === ContentType.STORY && mediaFilesNumber > 1) {
      throw new BadRequestException(
        sendResponse(
          HttpStatus.BAD_REQUEST,
          message.storage.story_must_have_one_media,
          undefined,
          errorCode.storage.story_must_have_one_media,
        ),
      );
    }

    // Compute next sort order offset from the last existing media item.
    const lastSortOrder =
      existingMediaFiles.length > 0
        ? existingMediaFiles[existingMediaFiles.length - 1].sortOrder
        : 0;
    // Create upload session id
    const uploadSessionId = randomUUID();
    // Build new temporary media keys with sequential sort order.
    const newMediaKeys = Array.from(
      { length: mediaFilesNumber },
      (_, index) => {
        return `temp/media/${content.author.id}/${uploadSessionId}/${lastSortOrder + index + 1}`;
      },
    );

    // Generate presigned upload URLs for each new media key.
    const presignedUrls = await Promise.all(
      newMediaKeys.map((mediaKey) =>
        getSignedUrl(
          this.s3Client,
          new PutObjectCommand({
            Bucket: this.bucketName,
            Key: mediaKey,
          }),
          { expiresIn: this.presignedUrlS3StorageExpiresIn },
        ),
      ),
    );
    //Cache generated keys for confirm step
    const MAX_UPLOAD_TIME_BY_MS = this.configService.getOrThrow<number>(
      'MAX_UPLOAD_TIME_BY_MS',
    );
    await this.cacheManager.set(
      uploadSessionId,
      newMediaKeys,
      MAX_UPLOAD_TIME_BY_MS,
    );

    // Preserve existing media keys and append newly generated temp keys.
    const existingMediaKeys = existingMediaFiles.map(
      (existingMediaFile) => existingMediaFile.relativePath,
    );

    // Return upload context for client-side upload flow.
    return sendResponse(HttpStatus.OK, message.storage.request_upload_success, {
      uploadSessionId,
      presignedUrls: presignedUrls,
      mediaKeys: [...existingMediaKeys, ...newMediaKeys],
    });
  }
  /**
   * Resolves uploaded media keys from a cached upload session id.
   *
   * Also validates that every key belongs to the current user based on key owner id.
   *
   * Supported key formats:
   * - `temp/media/{ownerUserId}/{uploadSessionId}/{sortOrder}`
   * - `temp/media/content/{ownerUserId}/{sortOrder}` (backward compatibility)
   *
   * @param currentUserId Current authenticated user id.
   * @param uploadSessionId Unique upload session id returned by upload request endpoint.
   * @returns Deduplicated media keys associated with the upload session.
   * @throws BadRequestException When upload session id is invalid, key format is invalid,
   * or key owner id does not match current user.
   */
  async validateAndResolveMediaKeysFromUploadSession(
    currentUserId: number,
    uploadSessionId?: string,
  ) {
    // Treat missing session id as "no media attached".
    if (!uploadSessionId) return [];

    // Load media keys from cache by upload session id.
    const cachedMediaKeys =
      await this.cacheManager.get<string[]>(uploadSessionId);

    // Validate cache payload shape before using it in post creation flow.
    if (
      !Array.isArray(cachedMediaKeys) ||
      cachedMediaKeys.length === 0 ||
      !cachedMediaKeys.every(
        (cachedMediaKey) =>
          typeof cachedMediaKey === 'string' && cachedMediaKey.length > 0,
      )
    ) {
      throw new BadRequestException(
        sendResponse(
          HttpStatus.BAD_REQUEST,
          message.storage.invalid_upload_session_id,
          undefined,
          errorCode.storage.invalid_upload_session_id,
        ),
      );
    }

    // Remove duplicate keys to make downstream media processing deterministic.
    const dedupedMediaKeys = Array.from(new Set(cachedMediaKeys));

    // Parse owner id from each key and ensure it belongs to current user.
    const areAllMediaKeysOwnedByCurrentUser = dedupedMediaKeys.every(
      (mediaKey) => {
        const currentFormatMatch = mediaKey.match(
          /^temp\/media\/(\d+)\/[^/]+\/\d+$/,
        );
        const ownerIdRaw = currentFormatMatch?.[1];
        if (!ownerIdRaw) return false;
        const ownerIdFromKey = Number(ownerIdRaw);
        if (!Number.isInteger(ownerIdFromKey)) return false;
        return ownerIdFromKey === currentUserId;
      },
    );
    if (!areAllMediaKeysOwnedByCurrentUser) {
      throw new BadRequestException(
        sendResponse(
          HttpStatus.BAD_REQUEST,
          message.storage.invalid_upload_session_id,
          undefined,
          errorCode.storage.invalid_upload_session_id,
        ),
      );
    }
    return dedupedMediaKeys;
  }
  /**
   * Validates uploaded media objects by checking existence, size, and detected MIME type.
   *
   * @param parsedMediaKeys Parsed temporary media keys with sort order.
   * @param maxMediaFileSizeInBytes Maximum allowed file size in bytes.
   * @returns Validated media metadata with resolved media type for each key.
   * @throws NotFoundException When uploaded object does not exist or cannot be read.
   * @throws BadRequestException When file size exceeds limit or MIME type is invalid.
   */
  async validateUploadedMediaObjects(mediaKeys: string[]) {
    return await Promise.all(
      mediaKeys.map(async (mediaKey) => {
        // Read object size and file header bytes in parallel for fast validation.
        const [mediaObjectSize, mediaObjectHeadBytes] = await Promise.all([
          this.getObjectSize(mediaKey),
          this.getObjectHeadBytes(mediaKey, 4096),
        ]);

        // Reject when uploaded object is missing or unreadable.
        if (!mediaObjectSize || !mediaObjectHeadBytes) {
          throw new NotFoundException(
            sendResponse(
              HttpStatus.NOT_FOUND,
              message.storage.object_not_found,
              undefined,
              errorCode.storage.object_not_found,
            ),
          );
        }

        // Enforce max file size and clean up invalid object from storage.
        if (mediaObjectSize > this.maxMediaFileSizeInBytes) {
          await this.deleteObject(mediaKey);
          throw new BadRequestException(
            sendResponse(
              HttpStatus.BAD_REQUEST,
              message.storage.media_file_too_large,
              undefined,
              errorCode.storage.media_file_too_large,
            ),
          );
        }

        // Detect MIME type from magic bytes and ensure it is in allowed list.
        const detectedMimeType =
          this.detectMimeTypeFromMagicBytes(mediaObjectHeadBytes);
        const isValidDetectedMimeType =
          detectedMimeType && this.isAllowedMediaContentType(detectedMimeType);

        // Remove invalid object and reject when MIME type is unsupported.
        if (!isValidDetectedMimeType) {
          await this.deleteObject(mediaKey);
          throw new BadRequestException(
            sendResponse(
              HttpStatus.BAD_REQUEST,
              message.storage.invalid_media_content_type,
              undefined,
              errorCode.storage.invalid_media_content_type,
            ),
          );
        }

        // Map detected MIME type to domain media type for persistence.
        const mediaType = this.getMediaTypeFromMimeType(detectedMimeType);
        return { mediaKey, mediaType };
      }),
    );
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
      sendResponse(
        HttpStatus.BAD_REQUEST,
        message.storage.invalid_media_key,
        undefined,
        errorCode.storage.invalid_media_key,
      ),
    );
  }

  isAllowedMediaContentType(mimeType: string): boolean {
    return this.mediaContentTypes.has(mimeType);
  }
  /**
   * if do not declare id, it will be uuid random
   * @param userId user id of content's author, owner of media
   * @param contentId id of content
   * @param id id to identify media in storage
   * @returns media key like `media/${userId}/${contentId}/${finalId}`
   */
  getPermanentMediaKey(userId: number, contentId: number, id?: string) {
    const finalId = id ? id : randomUUID();
    return `media/${userId}/${contentId}/${finalId}`;
  }
}
