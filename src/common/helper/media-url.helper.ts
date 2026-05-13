import { ConfigService } from '@nestjs/config';
/**
 *
 * @param configService
 * @param relativePath relative path of media file
 * @returns url of media file on aws s3 bucket
 */
export function ConvertMediaRelativePathToUrl(
  configService: ConfigService,
  relativePath: string,
) {
  const STORAGE_URL = configService.getOrThrow<string>('STORAGE_URL');
  return STORAGE_URL + relativePath;
}
/**
 *
 * @param configService
 * @param relativePaths relative paths of media files
 * @returns urls of media files on aws s3 bucket
 */
export function ConvertMediaRelativePathsToUrls(
  configService: ConfigService,
  relativePaths: string[],
) {
  const STORAGE_URL = configService.getOrThrow<string>('STORAGE_URL');
  return relativePaths.map((relativePath) => STORAGE_URL + relativePath);
}
