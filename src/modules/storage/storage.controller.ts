import { message } from '../../common/helper/message.helper';
import { ResponseMessage } from '../../common/decorator/response-message.decorator';
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
import { SkipThrottle } from '@nestjs/throttler';
import { UserThrottlerGuard } from '../../common/guard/throttler.guard';
import { SessionGuard } from '../../common/guard/session.guard';
import { CurrentUser } from '../token/currentuser.decorator';
import { AuthUser } from '../token/authuser.interface';
import { StorageService } from './storage.service';
import { ContentIdDTO } from '../../common/dtos/content-id.dto';
import { MediaFileNumberDTO } from './dtos/media-file-number.dto';

@Controller('storage')
@UseGuards(SessionGuard, UserThrottlerGuard)
@SkipThrottle({ public: true })
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @ResponseMessage({
    request_upload_success: message.storage.request_upload_success,
  })
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
  @ResponseMessage({
    request_upload_success: message.storage.request_upload_success,
  })
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
