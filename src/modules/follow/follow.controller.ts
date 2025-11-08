import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { FollowService } from './follow.service';
import { CurrentUser } from '../token/currentuser.decorator';
import { CursorDTO } from './dtos/cursor.dto';
import { AuthGuard } from '@nestjs/passport';
import { UserThrottlerGuard } from '../common/guard/throttler.guard';
import { UsernameDTO } from './dtos/username.dto';
import { TokenGuard } from '../common/guard/token.guard';
import { AuthUser } from '../token/authuser.interface';
import { SearchUserDTO } from './dtos/searchuser.dto';

@Controller('follow')
@UseGuards(AuthGuard('jwt'), TokenGuard, UserThrottlerGuard)
export class FollowController {
  constructor(private readonly followService: FollowService) {}
  @HttpCode(HttpStatus.OK)
  @Get('me/count')
  async getMyFollowNumber(@CurrentUser('username') username: string) {
    return await this.followService.getFollowNumber(username);
  }
  @HttpCode(HttpStatus.OK)
  @Get(':username/count')
  async getUserFollowNumber(@Param() usernameDTO: UsernameDTO) {
    return await this.followService.getFollowNumber(usernameDTO.username);
  }
  @HttpCode(HttpStatus.OK)
  @Get('me/followers')
  async getMyFollowers(
    @CurrentUser('username') username: string,
    @CurrentUser('sub') currentUserId: string,
    @Query() cursorDTO: CursorDTO,
  ) {
    return this.followService.getFollowers(
      username,
      currentUserId,
      cursorDTO.cursor,
    );
  }

  @HttpCode(HttpStatus.OK)
  @Get(':username/followers')
  async getUserFollowers(
    @Param() usernameDTO: UsernameDTO,
    @CurrentUser('sub') currentUserId: string,
    @Query() cursorDTO: CursorDTO,
  ) {
    return this.followService.getFollowers(
      usernameDTO.username,
      currentUserId,
      cursorDTO.cursor,
    );
  }

  @HttpCode(HttpStatus.OK)
  @Get('me/followings')
  async getMyFollowings(
    @CurrentUser('username') username: string,
    @CurrentUser('sub') currentUserId: string,
    @Query() cursorDTO: CursorDTO,
  ) {
    return this.followService.getFollowings(
      username,
      currentUserId,
      cursorDTO.cursor,
    );
  }

  @HttpCode(HttpStatus.OK)
  @Get(':username/followings')
  async getUserFollowings(
    @Param() usernameDTO: UsernameDTO,
    @CurrentUser('sub') currentUserId: string,
    @Query() cursorDTO: CursorDTO,
  ) {
    return this.followService.getFollowings(
      usernameDTO.username,
      currentUserId,
      cursorDTO.cursor,
    );
  }
  @HttpCode(HttpStatus.OK)
  @Post(':username')
  async postFollow(
    @CurrentUser('username') currentUsername: string,
    @Param() usernameDTO: UsernameDTO,
  ) {
    return await this.followService.postFollow(
      currentUsername,
      usernameDTO.username,
    );
  }
  @HttpCode(HttpStatus.OK)
  @Delete(':username')
  async deleteFollow(
    @CurrentUser('username') currentUsername: string,
    @Param() usernameDTO: UsernameDTO,
  ) {
    return await this.followService.deleteFollow(
      currentUsername,
      usernameDTO.username,
    );
  }
  @HttpCode(HttpStatus.OK)
  @Get(':username/state')
  async getFollowState(
    @CurrentUser('username') currentUsername: string,
    @Param() usernameDTO: UsernameDTO,
  ) {
    return await this.followService.getFollowState(
      currentUsername,
      usernameDTO.username,
    );
  }
  @HttpCode(HttpStatus.OK)
  @Get('search')
  async getUsersByKey(
    @CurrentUser() currentUser: AuthUser,
    @Query() searchPostDTO: SearchUserDTO,
    @Query() cursorDTO: CursorDTO,
  ) {
    return await this.followService.getUsersByKey(
      currentUser,
      searchPostDTO,
      cursorDTO.cursor,
    );
  }
}
