import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SkipThrottle } from '@nestjs/throttler';
import { UserThrottlerGuard } from '../common/guard/throttler.guard';
import { TokenGuard } from '../common/guard/token.guard';
import { CurrentUser } from '../token/currentuser.decorator';
import { AuthUser } from '../token/authuser.interface';
import { StorageService } from './storage.service';
import { ContentIdDTO } from '../content/dtos/content-id.dto';
import { MediaFileNumberDTO } from './dtos/media-file-number.dto';

@Controller('storage')
@UseGuards(AuthGuard('jwt'), TokenGuard, UserThrottlerGuard)
@SkipThrottle({ public: true })
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @HttpCode(HttpStatus.OK)
  @Post('request/upload')
  async requestUpload(
    @CurrentUser() currentUser: AuthUser,
    @Body('mediaFileNumber') mediaFileNumber: number,
  ) {
    return await this.storageService.genMediaPresignedUrls(
      mediaFileNumber,
      currentUser.sub,
    );
  }
  @HttpCode(HttpStatus.OK)
  @Patch('request/upload/:contentId')
  async requestUpdateUpload(
    @CurrentUser() currentUser: AuthUser,
    @Param() contentIdDTO: ContentIdDTO,
    @Body() mediaFileNumberDTO: MediaFileNumberDTO,
  ) {
    return await this.storageService.genUpdateMediaPresignedUrls(
      currentUser.sub,
      contentIdDTO.contentId,
      mediaFileNumberDTO.mediaFileNumber,
    );
  }
}
