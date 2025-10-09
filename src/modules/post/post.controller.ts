import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PostService } from './post.service';
import { AuthGuard } from '@nestjs/passport';
import { UserThrottlerGuard } from '../common/guard/throttler.guard';
import { SkipThrottle } from '@nestjs/throttler';
import { CurrentUser } from '../token/currentuser.decorator';
import { UsernameDTO } from './dtos/username.dto';
import { CursorDTO } from '../notification/dtos/cursor.dto';

@Controller('post')
@UseGuards(AuthGuard('jwt'), UserThrottlerGuard)
@SkipThrottle({ public: true })
export class PostController {
  constructor(private readonly postService: PostService) {}
  @HttpCode(HttpStatus.OK)
  @Get('me/createdpost')
  async getSelfCreatedPost(
    @CurrentUser('username') username: string,
    @Query() cursorDTO?: CursorDTO,
  ) {
    return await this.postService.getCreatedPost(username, cursorDTO?.cursor);
  }
  @HttpCode(HttpStatus.OK)
  @Get(':username/createdpost')
  async getUserCreatedPost(
    @Param() usernameDTO: UsernameDTO,
    @Query() cursorDTO?: CursorDTO,
  ) {
    return await this.postService.getCreatedPost(
      usernameDTO.username,
      cursorDTO?.cursor,
    );
  }
  @HttpCode(HttpStatus.OK)
  @Get('me/savedpost')
  async getSavedPost(
    @CurrentUser('username') username: string,
    @Query() cursorDTO?: CursorDTO,
  ) {
    return await this.postService.getSavedPost(username, cursorDTO?.cursor);
  }
}
