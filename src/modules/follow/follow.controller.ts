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
import { message } from '../../common/helper/message.helper';
import { ResponseMessage } from '../../common/decorator/response-message.decorator';
import { CurrentUser } from '../token/currentuser.decorator';
import { UserThrottlerGuard } from '../../common/guard/throttler.guard';
import { UsernameDTO } from '../../common/dtos/username.dto';
import { SessionGuard } from '../../common/guard/session.guard';
import { SearchUserWithCursorDTO } from '../../common/dtos/search-user-with-cursor.dto';
import { AuthUser } from '../token/authuser.interface';
import { SkipThrottle } from '@nestjs/throttler';

@Controller('follow')
@UseGuards(SessionGuard, UserThrottlerGuard)
@SkipThrottle({ public: true })
export class FollowController {
  constructor(private readonly followService: FollowService) {}
  @ResponseMessage({ success: message.follow.get_follow_number.success })
  @HttpCode(HttpStatus.OK)
  @Get('count')
  async getMyFollowNumber(@CurrentUser() currentUser: AuthUser) {
    return await this.followService.getFollowNumber(currentUser);
  }
  @ResponseMessage({ success: message.follow.get_follow_number.success })
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
  @ResponseMessage({ success: message.follow.get_follower_list.success })
  @HttpCode(HttpStatus.OK)
  @Get('followers')
  async getMyFollowers(
    @CurrentUser('sub') currentUserId: number,
    @Query() query: SearchUserWithCursorDTO,
  ) {
    const key = query.key?.trim();
    if (key) {
      return await this.followService.searchFollowersByKey(
        undefined,
        currentUserId,
        key,
        query.cursor,
      );
    }
    return await this.followService.getFollowers(
      undefined,
      currentUserId,
      query.cursor,
    );
  }

  @ResponseMessage({ success: message.follow.get_follower_list.success })
  @HttpCode(HttpStatus.OK)
  @Get(':username/followers')
  async getUserFollowers(
    @Param() usernameDTO: UsernameDTO,
    @CurrentUser('sub') currentUserId: number,
    @Query() query: SearchUserWithCursorDTO,
  ) {
    const key = query.key?.trim();
    if (key) {
      return await this.followService.searchFollowersByKey(
        usernameDTO.username,
        currentUserId,
        key,
        query.cursor,
      );
    }
    return await this.followService.getFollowers(
      usernameDTO.username,
      currentUserId,
      query.cursor,
    );
  }

  @ResponseMessage({ success: message.follow.get_following_list.success })
  @HttpCode(HttpStatus.OK)
  @Get('followings')
  async getMyFollowings(
    @CurrentUser('sub') currentUserId: number,
    @Query() query: SearchUserWithCursorDTO,
  ) {
    const key = query.key?.trim();
    if (key) {
      return await this.followService.searchFollowingsByKey(
        undefined,
        currentUserId,
        key,
        query.cursor,
      );
    }
    return await this.followService.getFollowings(
      undefined,
      currentUserId,
      query.cursor,
    );
  }

  @ResponseMessage({ success: message.follow.get_following_list.success })
  @HttpCode(HttpStatus.OK)
  @Get(':username/followings')
  async getUserFollowings(
    @Param() usernameDTO: UsernameDTO,
    @CurrentUser('sub') currentUserId: number,
    @Query() query: SearchUserWithCursorDTO,
  ) {
    const key = query.key?.trim();
    if (key) {
      return await this.followService.searchFollowingsByKey(
        usernameDTO.username,
        currentUserId,
        key,
        query.cursor,
      );
    }
    return this.followService.getFollowings(
      usernameDTO.username,
      currentUserId,
      query.cursor,
    );
  }
  @ResponseMessage({ success: message.follow.post_follow.success })
  @HttpCode(HttpStatus.OK)
  @Post(':username')
  async postFollow(
    @CurrentUser() currentUser: AuthUser,
    @Param() usernameDTO: UsernameDTO,
  ) {
    return await this.followService.postFollow(
      currentUser,
      usernameDTO.username,
    );
  }
  @ResponseMessage({ success: message.follow.delete_follow.success })
  @HttpCode(HttpStatus.OK)
  @Delete(':username')
  async deleteFollow(
    @CurrentUser() currentUser: AuthUser,
    @Param() usernameDTO: UsernameDTO,
  ) {
    return await this.followService.deleteFollow(
      currentUser,
      usernameDTO.username,
    );
  }
  @ResponseMessage({ sucess: message.follow.get_follow_state.sucess })
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
