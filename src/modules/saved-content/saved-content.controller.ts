import { message } from '../../common/helper/message.helper';
import { ResponseMessage } from '../../common/decorator/response-message.decorator';
import {
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { SavedContentService } from './saved-content.service';
import { SessionGuard } from '../../common/guard/session.guard';
import { UserThrottlerGuard } from '../../common/guard/throttler.guard';
import { SkipThrottle } from '@nestjs/throttler';
import { CurrentUser } from '../token/currentuser.decorator';
import { AuthUser } from '../token/authuser.interface';
import { ContentIdDTO } from '../../common/dtos/content-id.dto';

@Controller('content')
@UseGuards(SessionGuard, UserThrottlerGuard)
@SkipThrottle({ public: true })
export class SavedContentController {
  constructor(private readonly savedContentService: SavedContentService) {}

  @ResponseMessage({ success: message.content.save_content.success })
  @HttpCode(HttpStatus.OK)
  @Post(':contentId/save')
  async saveContent(
    @CurrentUser() currentUser: AuthUser,
    @Param() contentIdDTO: ContentIdDTO,
  ) {
    return await this.savedContentService.saveContent(
      currentUser.sub,
      contentIdDTO.contentId,
    );
  }

  @ResponseMessage({ success: message.content.unsave_content.success })
  @HttpCode(HttpStatus.OK)
  @Delete(':contentId/save')
  async unsaveContent(
    @CurrentUser() currentUser: AuthUser,
    @Param() contentIdDTO: ContentIdDTO,
  ) {
    return await this.savedContentService.unsaveContent(
      currentUser.sub,
      contentIdDTO.contentId,
    );
  }
}
