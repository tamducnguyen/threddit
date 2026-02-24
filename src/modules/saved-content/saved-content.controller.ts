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
import { AuthGuard } from '@nestjs/passport';
import { TokenGuard } from '../common/guard/token.guard';
import { UserThrottlerGuard } from '../common/guard/throttler.guard';
import { SkipThrottle } from '@nestjs/throttler';
import { CurrentUser } from '../token/currentuser.decorator';
import { AuthUser } from '../token/authuser.interface';
import { ContentIdDTO } from './dtos/content-id.dto';

@Controller('content')
@UseGuards(AuthGuard('jwt'), TokenGuard, UserThrottlerGuard)
@SkipThrottle({ public: true })
export class SavedContentController {
  constructor(private readonly savedContentService: SavedContentService) {}

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

  @HttpCode(HttpStatus.OK)
  @Delete(':contentId/unsave')
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
