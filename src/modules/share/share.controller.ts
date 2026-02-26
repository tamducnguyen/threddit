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
import { AuthGuard } from '@nestjs/passport';
import { TokenGuard } from '../common/guard/token.guard';
import { UserThrottlerGuard } from '../common/guard/throttler.guard';
import { SkipThrottle } from '@nestjs/throttler';
import { CurrentUser } from '../token/currentuser.decorator';
import { AuthUser } from '../token/authuser.interface';
import { ContentIdDTO } from '../content/dtos/content-id.dto';
import { ShareContentDTO } from './dtos/share-content.dto';

@Controller('content')
@UseGuards(AuthGuard('jwt'), TokenGuard, UserThrottlerGuard)
@SkipThrottle({ public: true })
export class ShareController {
  constructor(private readonly shareService: ShareService) {}

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
