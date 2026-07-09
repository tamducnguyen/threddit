import { message } from '../../common/helper/message.helper';
import { ResponseMessage } from '../../common/decorator/response-message.decorator';
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
import { SessionGuard } from '../../common/guard/session.guard';
import { UserThrottlerGuard } from '../../common/guard/throttler.guard';
import { CurrentUser } from '../token/currentuser.decorator';
import { UsernameDTO } from '../../common/dtos/username.dto';
import { CursorDTO } from '../../common/dtos/cursor.dto';
import { AuthUser } from '../token/authuser.interface';
import { SearchUserOptionalDTO } from '../../common/dtos/search-user.dto';
import { SkipThrottle } from '@nestjs/throttler';

@Controller('friendship')
@UseGuards(SessionGuard, UserThrottlerGuard)
@SkipThrottle({ public: true })
export class FriendshipController {
  constructor(private readonly friendshipService: FriendshipService) {}

  @ResponseMessage({
    friendship_accepted: message.friendship.send_request.friendship_accepted,
    success: message.friendship.send_request.success,
  })
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

  @ResponseMessage({
    success: message.friendship.get_received_requests.success,
  })
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

  @ResponseMessage({ success: message.friendship.get_sent_requests.success })
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

  @ResponseMessage({ success: message.friendship.accept_request.success })
  @HttpCode(HttpStatus.OK)
  @Post('request/:username/accept')
  async acceptFriendRequest(
    @CurrentUser() currentUser: AuthUser,
    @Param() usernameDTO: UsernameDTO,
  ) {
    return await this.friendshipService.acceptFriendRequest(
      currentUser.sub,
      usernameDTO.username,
    );
  }

  @ResponseMessage({ success: message.friendship.reject_request.success })
  @HttpCode(HttpStatus.OK)
  @Post('request/:username/reject')
  async rejectFriendRequest(
    @CurrentUser() currentUser: AuthUser,
    @Param() usernameDTO: UsernameDTO,
  ) {
    return await this.friendshipService.rejectFriendRequest(
      currentUser.sub,
      usernameDTO.username,
    );
  }

  @ResponseMessage({ success: message.friendship.cancel_request.success })
  @HttpCode(HttpStatus.OK)
  @Post('request/:username/cancel')
  async cancelFriendRequest(
    @CurrentUser() currentUser: AuthUser,
    @Param() usernameDTO: UsernameDTO,
  ) {
    return await this.friendshipService.cancelFriendRequest(
      currentUser.sub,
      usernameDTO.username,
    );
  }

  @ResponseMessage({ success: message.friendship.get_friend_list.success })
  @HttpCode(HttpStatus.OK)
  @Get('friend')
  async getFriends(
    @CurrentUser() currentUser: AuthUser,
    @Query() searchUserDTO?: SearchUserOptionalDTO,
    @Query() cursorDTO?: CursorDTO,
  ) {
    return await this.friendshipService.getFriends(
      currentUser,
      undefined,
      searchUserDTO?.key?.trim(),
      cursorDTO?.cursor,
    );
  }

  @ResponseMessage({ success: message.friendship.get_friend_list.success })
  @HttpCode(HttpStatus.OK)
  @Get(':username/friend')
  async getUserFriends(
    @CurrentUser() currentUser: AuthUser,
    @Param() usernameDTO: UsernameDTO,
    @Query() searchUserDTO?: SearchUserOptionalDTO,
    @Query() cursorDTO?: CursorDTO,
  ) {
    return await this.friendshipService.getFriends(
      currentUser,
      usernameDTO.username,
      searchUserDTO?.key?.trim(),
      cursorDTO?.cursor,
    );
  }

  @ResponseMessage({ success: message.friendship.get_friend_status.success })
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

  @ResponseMessage({ success: message.friendship.unfriend.success })
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

  @ResponseMessage({
    success: message.friendship.get_mutual_friend_list.success,
  })
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

  @ResponseMessage({
    success: message.friendship.get_mutual_friend_count.success,
  })
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

  @ResponseMessage({ success: message.friendship.get_friend_count.success })
  @HttpCode(HttpStatus.OK)
  @Get('friend/count')
  async getFriendCount(@CurrentUser() currentUser: AuthUser) {
    return await this.friendshipService.getFriendCount(currentUser);
  }

  @ResponseMessage({
    success: message.friendship.get_user_friend_count.success,
  })
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

  @ResponseMessage({
    success: message.friendship.get_sent_request_count.success,
  })
  @HttpCode(HttpStatus.OK)
  @Get('request/sent/count')
  async getSentFriendRequestCount(@CurrentUser() currentUser: AuthUser) {
    return await this.friendshipService.getSentFriendRequestCount(currentUser);
  }

  @ResponseMessage({
    success: message.friendship.get_received_request_count.success,
  })
  @HttpCode(HttpStatus.OK)
  @Get('request/received/count')
  async getReceivedFriendRequestCount(@CurrentUser() currentUser: AuthUser) {
    return await this.friendshipService.getReceivedFriendRequestCount(
      currentUser,
    );
  }
}
