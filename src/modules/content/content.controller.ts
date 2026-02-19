import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ContentService } from './content.service';
import { AuthGuard } from '@nestjs/passport';
import { UserThrottlerGuard } from '../common/guard/throttler.guard';
import { SkipThrottle } from '@nestjs/throttler';
import { CurrentUser } from '../token/currentuser.decorator';
import { CursorDTO } from './dtos/cursor.dto';
import { TokenGuard } from '../common/guard/token.guard';
import { AuthUser } from '../token/authuser.interface';
import { UsernameDTO } from './dtos/username.dto';
import { CreatePostDTO } from './dtos/create-post.dto';
import { ConfirmUploadContentMediaDTO } from './dtos/confirm-upload-content-media.dto';

@Controller('content')
@UseGuards(AuthGuard('jwt'), TokenGuard, UserThrottlerGuard)
@SkipThrottle({ public: true })
export class ContentController {
  constructor(private readonly contentService: ContentService) {}
  @HttpCode(HttpStatus.OK)
  @Get('timeline-content')
  async getSelfTimelineContent(
    @CurrentUser() currentUser: AuthUser,
    @Query() cursorDTO?: CursorDTO,
  ) {
    return await this.contentService.getSelfTimelineContents(
      currentUser.sub,
      cursorDTO?.cursor,
    );
  }
  @HttpCode(HttpStatus.OK)
  @Get(':username/timeline-content')
  async getOtherTimelineContent(
    @CurrentUser() currentUser: AuthUser,
    @Param() usernameDTO: UsernameDTO,
    @Query() cursorDTO?: CursorDTO,
  ) {
    return await this.contentService.getOtherTimelineContents(
      currentUser.sub,
      usernameDTO.username,
      cursorDTO?.cursor,
    );
  }
  @HttpCode(HttpStatus.OK)
  @Get('saved-content')
  async getSavedContent(
    @CurrentUser() currentUser: AuthUser,
    @Query() cursorDTO?: CursorDTO,
  ) {
    return await this.contentService.getSavedContents(
      currentUser.sub,
      cursorDTO?.cursor,
    );
  }
  @HttpCode(HttpStatus.CREATED)
  @Post('post')
  async createPost(
    @CurrentUser() currentUser: AuthUser,
    @Body() createPostDTO: CreatePostDTO,
  ) {
    return await this.contentService.createPost(currentUser.sub, createPostDTO);
  }
  @HttpCode(HttpStatus.OK)
  @Post('media/confirm')
  async confirmedUploadContentMediaFiles(
    @CurrentUser() currentUser: AuthUser,
    @Body() confirmUploadContentMediaDTO: ConfirmUploadContentMediaDTO,
  ) {
    return await this.contentService.confirmedUploadContentMediaFiles(
      currentUser.sub,
      confirmUploadContentMediaDTO,
    );
  }
}
