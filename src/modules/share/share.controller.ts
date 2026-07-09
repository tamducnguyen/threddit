import { message } from '../../common/helper/message.helper';
import { ResponseMessage } from '../../common/decorator/response-message.decorator';
import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ShareService } from './share.service';
import { SessionGuard } from '../../common/guard/session.guard';
import { UserThrottlerGuard } from '../../common/guard/throttler.guard';
import { SkipThrottle } from '@nestjs/throttler';
import { CurrentUser } from '../token/currentuser.decorator';
import { AuthUser } from '../token/authuser.interface';
import { ContentIdDTO } from '../../common/dtos/content-id.dto';
import { ShareContentDTO } from './dtos/share-content.dto';

@Controller('content')
@UseGuards(SessionGuard, UserThrottlerGuard)
@SkipThrottle({ public: true })
export class ShareController {
  constructor(private readonly shareService: ShareService) {}

  @ResponseMessage({ success: message.content.share_content.success })
  @HttpCode(HttpStatus.OK)
  @Post(':contentId/share')
  async shareContent(
    @CurrentUser() currentUser: AuthUser,
    @Param() contentIdDTO: ContentIdDTO,
    @Body() shareContentDTO: ShareContentDTO,
  ) {
    return await this.shareService.shareContent(
      currentUser.sub,
      contentIdDTO.contentId,
      shareContentDTO,
    );
  }

  @ResponseMessage({ success: message.content.update_share_content.success })
  @HttpCode(HttpStatus.OK)
  @Patch(':contentId/share')
  async updateShareContent(
    @CurrentUser() currentUser: AuthUser,
    @Param() contentIdDTO: ContentIdDTO,
    @Body() shareContentDTO: ShareContentDTO,
  ) {
    return await this.shareService.updateShareContent(
      currentUser.sub,
      contentIdDTO.contentId,
      shareContentDTO,
    );
  }

  @ResponseMessage({ success: message.content.unshare_content.success })
  @HttpCode(HttpStatus.OK)
  @Delete(':contentId/share')
  async unshareContent(
    @CurrentUser() currentUser: AuthUser,
    @Param() contentIdDTO: ContentIdDTO,
  ) {
    return await this.shareService.unshareContent(
      currentUser.sub,
      contentIdDTO.contentId,
    );
  }
}
