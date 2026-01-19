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
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCookieAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

@ApiTags('Friendship')
@ApiBearerAuth()
@ApiCookieAuth()
@ApiUnauthorizedResponse({
  description:
    'Thiếu / token hết hạn / token đã bị thu hồi. Token có thể được gửi qua Authorization Bearer hoặc cookie.',
})
@ApiTooManyRequestsResponse({
  description: 'Gửi quá nhiều yêu cầu (rate limit).',
})
@Controller('friendship')
@UseGuards(AuthGuard('jwt'), TokenGuard, UserThrottlerGuard)
export class FriendshipController {
  constructor(private readonly friendshipService: FriendshipService) {}

  @HttpCode(HttpStatus.OK)
  @Post('request/:username')
  @ApiOperation({ summary: 'GỬi yêu cầu kết bạn thông qua username' })
  @ApiOkResponse({
    description:
      'Gửi thành công/ Kết bạn thành công do người nhận đã gửi lời mời trước đó',
  })
  @ApiBadRequestResponse({
    description: 'Không thể gửi cho chính bản thân mình',
  })
  @ApiNotFoundResponse({ description: 'Không tìm thấy người dùng' })
  @ApiParam({
    name: 'username',
    required: true,
    description: 'username của người dùng được gửi lời mời kết bạn',
    type: String,
  })
  async sendFriendRequest(
    @CurrentUser('username') currentUsername: string,
    @Param() usernameDTO: UsernameDTO,
  ) {
    return await this.friendshipService.sendFriendRequest(
      currentUsername,
      usernameDTO.username,
    );
  }

  @HttpCode(HttpStatus.OK)
  @Get('request/received')
  @ApiOperation({ summary: 'Lấy danh sách yêu cầu kết bạn đã nhận' })
  @ApiOkResponse({ description: 'Trả về danh sách yêu cầu kết bạn đã nhận.' })
  @ApiBadRequestResponse({ description: 'Cursor không hợp lệ.' })
  @ApiQuery({
    name: 'cursor',
    required: false,
    description: 'Token cursor dùng cho phân trang.',
    type: String,
  })
  @ApiQuery({
    name: 'key',
    required: false,
    description:
      'Từ khóa để tìm kiếm theo username hoặc tên hiển thị của người gửi.',
    type: String,
  })
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
  @ApiOperation({ summary: 'Lấy danh sách yêu cầu kết bạn đã gửi' })
  @ApiOkResponse({ description: 'Trả về danh sách yêu cầu kết bạn đã gửi.' })
  @ApiBadRequestResponse({ description: 'Cursor không hợp lệ.' })
  @ApiQuery({
    name: 'cursor',
    required: false,
    description: 'Token cursor dùng cho phân trang.',
    type: String,
  })
  @ApiQuery({
    name: 'key',
    required: false,
    description: 'Tìm kiếm theo username hoặc tên hiển thị của người nhận.',
    type: String,
  })
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
  @ApiOperation({ summary: 'Chấp nhận yêu cầu kết bạn' })
  @ApiOkResponse({ description: 'Yêu cầu kết bạn đã được chấp nhận.' })
  @ApiBadRequestResponse({
    description: 'Yêu cầu không tồn tại hoặc không hợp lệ.',
  })
  @ApiParam({
    name: 'friendshipId',
    required: true,
    description: 'ID của yêu cầu kết bạn cần chấp nhận.',
    type: Number,
  })
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
  @ApiOperation({ summary: 'Từ chối yêu cầu kết bạn' })
  @ApiOkResponse({ description: 'Yêu cầu kết bạn đã bị từ chối.' })
  @ApiBadRequestResponse({
    description: 'Yêu cầu không tồn tại hoặc không hợp lệ.',
  })
  @ApiParam({
    name: 'friendshipId',
    required: true,
    description: 'ID của yêu cầu kết bạn cần từ chối.',
    type: Number,
  })
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
  @ApiOperation({ summary: 'Hủy yêu cầu kết bạn đã gửi' })
  @ApiOkResponse({ description: 'Yêu cầu kết bạn đã được hủy.' })
  @ApiBadRequestResponse({
    description: 'Yêu cầu không tồn tại hoặc không hợp lệ.',
  })
  @ApiParam({
    name: 'friendshipId',
    required: true,
    description: 'ID của yêu cầu kết bạn cần hủy.',
    type: Number,
  })
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
  @ApiOperation({ summary: 'Lấy danh sách bạn bè của bạn' })
  @ApiOkResponse({ description: 'Trả về danh sách bạn bè.' })
  @ApiBadRequestResponse({ description: 'Cursor không hợp lệ.' })
  @ApiQuery({
    name: 'cursor',
    required: false,
    description: 'Token cursor dùng cho phân trang.',
    type: String,
  })
  @ApiQuery({
    name: 'key',
    required: false,
    description: 'Tìm kiếm theo username hoặc tên hiển thị của bạn bè.',
    type: String,
  })
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
  @ApiOperation({ summary: 'Lấy danh sách bạn bè của người khác' })
  @ApiOkResponse({ description: 'Trả về danh sách bạn bè.' })
  @ApiBadRequestResponse({ description: 'Cursor không hợp lệ.' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy người dùng.' })
  @ApiParam({
    name: 'username',
    required: true,
    description: 'Username của người dùng cần xem danh sách bạn bè.',
    type: String,
  })
  @ApiQuery({
    name: 'cursor',
    required: false,
    description: 'Token cursor dùng cho phân trang.',
    type: String,
  })
  @ApiQuery({
    name: 'key',
    required: false,
    description: 'Tìm kiếm theo username hoặc tên hiển thị của bạn bè.',
    type: String,
  })
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
  @ApiOperation({ summary: 'Lấy trạng thái quan hệ bạn bè với người dùng' })
  @ApiOkResponse({ description: 'Trả về trạng thái quan hệ bạn bè.' })
  @ApiBadRequestResponse({ description: 'Yêu cầu không hợp lệ.' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy người dùng.' })
  @ApiParam({
    name: 'username',
    required: true,
    description:
      'Username của người dùng cần kiểm tra trạng thái quan hệ bạn bè.',
    type: String,
  })
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
  @ApiOperation({ summary: 'Hủy kết bạn với người dùng' })
  @ApiOkResponse({ description: 'Hủy kết bạn thành công.' })
  @ApiBadRequestResponse({
    description: 'Quan hệ bạn bè không tồn tại hoặc không hợp lệ.',
  })
  @ApiNotFoundResponse({ description: 'Không tìm thấy người dùng.' })
  @ApiParam({
    name: 'username',
    required: true,
    description: 'Username của người dùng cần hủy kết bạn.',
    type: String,
  })
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
  @ApiOperation({ summary: 'Lấy danh sách bạn chung với người dùng' })
  @ApiOkResponse({ description: 'Trả về danh sách bạn chung.' })
  @ApiBadRequestResponse({ description: 'Cursor không hợp lệ.' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy người dùng.' })
  @ApiParam({
    name: 'username',
    required: true,
    description: 'Username của người dùng cần lấy danh sách bạn chung.',
    type: String,
  })
  @ApiQuery({
    name: 'cursor',
    required: false,
    description: 'Token cursor dùng cho phân trang.',
    type: String,
  })
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
  @ApiOperation({ summary: 'Lấy số lượng bạn chung với người dùng' })
  @ApiOkResponse({ description: 'Trả về số lượng bạn chung.' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy người dùng.' })
  @ApiParam({
    name: 'username',
    required: true,
    description: 'Username của người dùng cần lấy số lượng bạn chung.',
    type: String,
  })
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
  @ApiOperation({ summary: 'Lấy số lượng bạn bè của bạn' })
  @ApiOkResponse({ description: 'Trả về số lượng bạn bè.' })
  async getFriendCount(@CurrentUser() currentUser: AuthUser) {
    return await this.friendshipService.getFriendCount(currentUser);
  }

  @HttpCode(HttpStatus.OK)
  @Get(':username/friend/count')
  @ApiOperation({
    summary: 'Lấy số lượng bạn bè của người khác dựa trên username',
  })
  @ApiOkResponse({ description: 'Trả về số lượng bạn bè.' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy người dùng.' })
  @ApiParam({
    name: 'username',
    required: true,
    description: 'Username của người dùng cần lấy số lượng bạn bè.',
    type: String,
  })
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
  @ApiOperation({ summary: 'Lấy số lượng yêu cầu kết bạn đã gửi' })
  @ApiOkResponse({ description: 'Trả về số lượng yêu cầu kết bạn đã gửi' })
  async getSentFriendRequestCount(@CurrentUser() currentUser: AuthUser) {
    return await this.friendshipService.getSentFriendRequestCount(currentUser);
  }

  @HttpCode(HttpStatus.OK)
  @Get('request/received/count')
  @ApiOperation({ summary: 'Lấy số lượng những yêu cầu kết bạn đã nhận' })
  @ApiOkResponse({ description: 'Trả về số lượng yêu cầu kết bạn đã nhận' })
  async getReceivedFriendRequestCount(@CurrentUser() currentUser: AuthUser) {
    return await this.friendshipService.getReceivedFriendRequestCount(
      currentUser,
    );
  }
}
