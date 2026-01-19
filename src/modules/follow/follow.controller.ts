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
import { SearchUserOptionalDTO } from './dtos/searchuser.dto';
import { AuthUser } from '../token/authuser.interface';

@Controller('follow')
@UseGuards(AuthGuard('jwt'), TokenGuard, UserThrottlerGuard)
export class FollowController {
  constructor(private readonly followService: FollowService) {}
  @HttpCode(HttpStatus.OK)
  @Get('count')
  async getMyFollowNumber(@CurrentUser() currentUser: AuthUser) {
    return await this.followService.getFollowNumber(currentUser);
  }
  @HttpCode(HttpStatus.OK)
  @Get(':username/count')
  async getUserFollowNumber(
    @CurrentUser() currentUser: AuthUser,
    @Param() usernameDTO: UsernameDTO,
  ) {
    return await this.followService.getFollowNumber(
      currentUser,
      usernameDTO.username,
    );
  }
  @HttpCode(HttpStatus.OK)
  @Get('followers')
  async getMyFollowers(
    @CurrentUser('username') username: string,
    @CurrentUser('sub') currentUserId: number,
    @Query() searchUserDTO: SearchUserOptionalDTO,
    @Query() cursorDTO: CursorDTO,
  ) {
    const key = searchUserDTO.key?.trim();
    if (key) {
      return await this.followService.searchFollowersByKey(
        username,
        currentUserId,
        key,
        cursorDTO.cursor,
      );
    }
    return await this.followService.getFollowers(
      username,
      currentUserId,
      cursorDTO.cursor,
    );
  }

  @HttpCode(HttpStatus.OK)
  @Get(':username/followers')
  async getUserFollowers(
    @Param() usernameDTO: UsernameDTO,
    @CurrentUser('sub') currentUserId: number,
    @Query() searchUserDTO: SearchUserOptionalDTO,
    @Query() cursorDTO: CursorDTO,
  ) {
    const key = searchUserDTO.key?.trim();
    if (key) {
      return await this.followService.searchFollowersByKey(
        usernameDTO.username,
        currentUserId,
        key,
        cursorDTO.cursor,
      );
    }
    return await this.followService.getFollowers(
      usernameDTO.username,
      currentUserId,
      cursorDTO.cursor,
    );
  }

  @HttpCode(HttpStatus.OK)
  @Get('followings')
  async getMyFollowings(
    @CurrentUser('username') username: string,
    @CurrentUser('sub') currentUserId: number,
    @Query() searchUserDTO: SearchUserOptionalDTO,
    @Query() cursorDTO: CursorDTO,
  ) {
    const key = searchUserDTO.key?.trim();
    if (key) {
      return await this.followService.searchFollowingsByKey(
        username,
        currentUserId,
        key,
        cursorDTO.cursor,
      );
    }
    return await this.followService.getFollowings(
      username,
      currentUserId,
      cursorDTO.cursor,
    );
  }

  @HttpCode(HttpStatus.OK)
  @Get(':username/followings')
  async getUserFollowings(
    @Param() usernameDTO: UsernameDTO,
    @CurrentUser('sub') currentUserId: number,
    @Query() searchUserDTO: SearchUserOptionalDTO,
    @Query() cursorDTO: CursorDTO,
  ) {
    const key = searchUserDTO.key?.trim();
    if (key) {
      return await this.followService.searchFollowingsByKey(
        usernameDTO.username,
        currentUserId,
        key,
        cursorDTO.cursor,
      );
    }
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
  @Get(':username/status')
  async getFollowState(
    @CurrentUser() currentUser: AuthUser,
    @Param() usernameDTO: UsernameDTO,
  ) {
    return await this.followService.getFollowState(
      currentUser,
      usernameDTO.username,
    );
  }
}
