import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
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
import { ContentIdDTO } from './dtos/content-id.dto';
import { CreateContentDTO } from './dtos/create-content.dto';
import { UpdateContentDTO } from './dtos/update-content.dto';
import { SearchContentDTO } from './dtos/search-content.dto';

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
  @HttpCode(HttpStatus.OK)
  @Get('feed')
  async getFeed(@CurrentUser() currentUser: AuthUser) {
    return await this.contentService.getFeed(currentUser.sub);
  }
  @HttpCode(HttpStatus.OK)
  @Get('reel')
  async getReel(@CurrentUser() currentUser: AuthUser) {
    return await this.contentService.getReel(currentUser.sub);
  }
  @HttpCode(HttpStatus.OK)
  @Get('stories')
  async getMyStories(
    @CurrentUser() currentUser: AuthUser,
    @Query() cursorDTO?: CursorDTO,
  ) {
    return await this.contentService.getMyStories(
      currentUser.sub,
      cursorDTO?.cursor,
    );
  }
  @HttpCode(HttpStatus.OK)
  @Get('current-stories')
  async getMyCurrentStories(
    @CurrentUser() currentUser: AuthUser,
    @Query() cursorDTO?: CursorDTO,
  ) {
    return await this.contentService.getMyCurrentStories(
      currentUser.sub,
      cursorDTO?.cursor,
    );
  }
  @HttpCode(HttpStatus.OK)
  @Get(':username/current-stories')
  async getOtherCurrentStories(
    @CurrentUser() currentUser: AuthUser,
    @Param() usernameDTO: UsernameDTO,
    @Query() cursorDTO?: CursorDTO,
  ) {
    return await this.contentService.getOtherCurrentStories(
      currentUser.sub,
      usernameDTO.username,
      cursorDTO?.cursor,
    );
  }
  @HttpCode(HttpStatus.OK)
  @Get('friend-stories')
  async getFriendStories(
    @CurrentUser() currentUser: AuthUser,
    @Query() cursorDTO?: CursorDTO,
  ) {
    return await this.contentService.getFriendStories(
      currentUser.sub,
      cursorDTO?.cursor,
    );
  }
  @HttpCode(HttpStatus.OK)
  @Get('pinned-stories')
  async getPinnedStories(
    @CurrentUser() currentUser: AuthUser,
    @Query() cursorDTO?: CursorDTO,
  ) {
    return await this.contentService.getPinnedStories(
      currentUser.sub,
      cursorDTO?.cursor,
    );
  }
  @HttpCode(HttpStatus.OK)
  @Get()
  async searchContents(
    @CurrentUser() currentUser: AuthUser,
    @Query() searchContentDTO: SearchContentDTO,
  ) {
    return await this.contentService.searchContents(
      currentUser.sub,
      searchContentDTO.key,
      searchContentDTO.cursor,
    );
  }
  @HttpCode(HttpStatus.OK)
  @Get(':username/pinned-stories')
  async getOtherPinnedStories(
    @CurrentUser() currentUser: AuthUser,
    @Param() usernameDTO: UsernameDTO,
    @Query() cursorDTO?: CursorDTO,
  ) {
    return await this.contentService.getOtherPinnedStories(
      currentUser.sub,
      usernameDTO.username,
      cursorDTO?.cursor,
    );
  }
  @HttpCode(HttpStatus.OK)
  @Get(':contentId')
  async getContent(
    @CurrentUser() currentUser: AuthUser,
    @Param() contentIdDTO: ContentIdDTO,
  ) {
    return await this.contentService.getContent(
      currentUser.sub,
      contentIdDTO.contentId,
    );
  }
  @HttpCode(HttpStatus.CREATED)
  @Post()
  async createContent(
    @CurrentUser() currentUser: AuthUser,
    @Body() createContentDTO: CreateContentDTO,
  ) {
    return await this.contentService.createContent(
      currentUser.sub,
      createContentDTO,
    );
  }
  @HttpCode(HttpStatus.OK)
  @Patch(':contentId')
  async updateContent(
    @CurrentUser() currentUser: AuthUser,
    @Param() contentIdDTO: ContentIdDTO,
    @Body() updateContentDTO: UpdateContentDTO,
  ) {
    return await this.contentService.updateContent(
      currentUser.sub,
      contentIdDTO.contentId,
      updateContentDTO,
    );
  }
  @HttpCode(HttpStatus.OK)
  @Post(':contentId/pin')
  async pinContent(
    @CurrentUser() currentUser: AuthUser,
    @Param() contentIdDTO: ContentIdDTO,
  ) {
    return await this.contentService.pinContent(
      currentUser.sub,
      contentIdDTO.contentId,
    );
  }
  @HttpCode(HttpStatus.OK)
  @Delete(':contentId/pin')
  async unpinContent(
    @CurrentUser() currentUser: AuthUser,
    @Param() contentIdDTO: ContentIdDTO,
  ) {
    return await this.contentService.unpinContent(
      currentUser.sub,
      contentIdDTO.contentId,
    );
  }
  @HttpCode(HttpStatus.OK)
  @Delete(':contentId')
  /**
   * Deletes an owned content by id.
   */
  async deleteContent(
    @CurrentUser() currentUser: AuthUser,
    @Param() contentIdDTO: ContentIdDTO,
  ) {
    return await this.contentService.deleteContent(
      currentUser.sub,
      contentIdDTO.contentId,
    );
  }
}
