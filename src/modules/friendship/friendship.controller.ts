import {
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { FriendshipService } from './friendship.service';
import { AuthGuard } from '@nestjs/passport';
import { TokenGuard } from '../common/guard/token.guard';
import { UserThrottlerGuard } from '../common/guard/throttler.guard';
import { CurrentUser } from '../token/currentuser.decorator';
import { UsernameDTO } from './dtos/username.dto';
import { CursorDTO } from './dtos/cursor.dto';
import { AuthUser } from '../token/authuser.interface';
import { FriendshipIdDTO } from './dtos/friendshipid.dto';
import { SearchUserOptionalDTO } from './dtos/searchuser.dto';
import { SkipThrottle } from '@nestjs/throttler';

@Controller('friendship')
@UseGuards(AuthGuard('jwt'), TokenGuard, UserThrottlerGuard)
@SkipThrottle({ public: true })
export class FriendshipController {
  constructor(private readonly friendshipService: FriendshipService) {}

  @HttpCode(HttpStatus.OK)
  @Post('request/:username')
  async sendFriendRequest(
    @CurrentUser() currentUser: AuthUser,
    @Param() usernameDTO: UsernameDTO,
  ) {
    return await this.friendshipService.sendFriendRequest(
      currentUser,
      usernameDTO.username,
    );
  }

  @HttpCode(HttpStatus.OK)
  @Get('request/received')
  async getReceivedFriendRequests(
    @CurrentUser() currentUser: AuthUser,
    @Query() searchUserDTO?: SearchUserOptionalDTO,
    @Query() cursorDTO?: CursorDTO,
  ) {
    return await this.friendshipService.getReceivedFriendRequests(
      currentUser,
      searchUserDTO?.key?.trim(),
      cursorDTO?.cursor,
    );
  }

  @HttpCode(HttpStatus.OK)
  @Get('request/sent')
  async getSentFriendRequests(
    @CurrentUser() currentUser: AuthUser,
    @Query() searchUserDTO?: SearchUserOptionalDTO,
    @Query() cursorDTO?: CursorDTO,
  ) {
    return await this.friendshipService.getSentFriendRequests(
      currentUser,
      searchUserDTO?.key?.trim(),
      cursorDTO?.cursor,
    );
  }

  @HttpCode(HttpStatus.OK)
  @Post('request/:friendshipId/accept')
  async acceptFriendRequest(
    @CurrentUser() currentUser: AuthUser,
    @Param() friendshipIdDTO: FriendshipIdDTO,
  ) {
    return await this.friendshipService.acceptFriendRequest(
      currentUser,
      friendshipIdDTO.friendshipId,
    );
  }

  @HttpCode(HttpStatus.OK)
  @Post('request/:friendshipId/reject')
  async rejectFriendRequest(
    @CurrentUser() currentUser: AuthUser,
    @Param() friendshipIdDTO: FriendshipIdDTO,
  ) {
    return await this.friendshipService.rejectFriendRequest(
      currentUser,
      friendshipIdDTO.friendshipId,
    );
  }

  @HttpCode(HttpStatus.OK)
  @Post('request/:friendshipId/cancel')
  async cancelFriendRequest(
    @CurrentUser() currentUser: AuthUser,
    @Param() friendshipIdDTO: FriendshipIdDTO,
  ) {
    return await this.friendshipService.cancelFriendRequest(
      currentUser,
      friendshipIdDTO.friendshipId,
    );
  }

  @HttpCode(HttpStatus.OK)
  @Get('friend')
  async getFriends(
    @CurrentUser() currentUser: AuthUser,
    @Query() searchUserDTO?: SearchUserOptionalDTO,
    @Query() cursorDTO?: CursorDTO,
  ) {
    return await this.friendshipService.getFriends(
      currentUser,
      searchUserDTO?.key?.trim(),
      cursorDTO?.cursor,
    );
  }

  @HttpCode(HttpStatus.OK)
  @Get(':username/friend')
  async getUserFriends(
    @CurrentUser() currentUser: AuthUser,
    @Param() usernameDTO: UsernameDTO,
    @Query() searchUserDTO?: SearchUserOptionalDTO,
    @Query() cursorDTO?: CursorDTO,
  ) {
    return await this.friendshipService.getUserFriends(
      currentUser,
      usernameDTO.username,
      searchUserDTO?.key?.trim(),
      cursorDTO?.cursor,
    );
  }

  @HttpCode(HttpStatus.OK)
  @Get(':username/status')
  async getFriendStatus(
    @CurrentUser() currentUser: AuthUser,
    @Param() usernameDTO: UsernameDTO,
  ) {
    return await this.friendshipService.getFriendStatus(
      currentUser,
      usernameDTO.username,
    );
  }

  @HttpCode(HttpStatus.OK)
  @Delete(':username')
  async unfriend(
    @CurrentUser() currentUser: AuthUser,
    @Param() usernameDTO: UsernameDTO,
  ) {
    return await this.friendshipService.unfriend(
      currentUser,
      usernameDTO.username,
    );
  }

  @HttpCode(HttpStatus.OK)
  @Get(':username/friend/mutual')
  async getMutualFriends(
    @CurrentUser() currentUser: AuthUser,
    @Param() usernameDTO: UsernameDTO,
    @Query() cursorDTO?: CursorDTO,
  ) {
    return await this.friendshipService.getMutualFriends(
      currentUser,
      usernameDTO.username,
      cursorDTO?.cursor,
    );
  }

  @HttpCode(HttpStatus.OK)
  @Get(':username/friend/mutual/count')
  async getMutualFriendCount(
    @CurrentUser() currentUser: AuthUser,
    @Param() usernameDTO: UsernameDTO,
  ) {
    return await this.friendshipService.getMutualFriendCount(
      currentUser,
      usernameDTO.username,
    );
  }

  @HttpCode(HttpStatus.OK)
  @Get('friend/count')
  async getFriendCount(@CurrentUser() currentUser: AuthUser) {
    return await this.friendshipService.getFriendCount(currentUser);
  }

  @HttpCode(HttpStatus.OK)
  @Get(':username/friend/count')
  async getUserFriendCount(
    @CurrentUser() currentUser: AuthUser,
    @Param() usernameDTO: UsernameDTO,
  ) {
    return await this.friendshipService.getUserFriendCount(
      currentUser,
      usernameDTO.username,
    );
  }

  @HttpCode(HttpStatus.OK)
  @Get('request/sent/count')
  async getSentFriendRequestCount(@CurrentUser() currentUser: AuthUser) {
    return await this.friendshipService.getSentFriendRequestCount(currentUser);
  }

  @HttpCode(HttpStatus.OK)
  @Get('request/received/count')
  async getReceivedFriendRequestCount(@CurrentUser() currentUser: AuthUser) {
    return await this.friendshipService.getReceivedFriendRequestCount(
      currentUser,
    );
  }
}
