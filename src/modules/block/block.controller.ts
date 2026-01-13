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
import { BlockService } from './block.service';
import { CurrentUser } from '../token/currentuser.decorator';
import { AuthUser } from '../token/authuser.interface';
import { UsernameDTO } from './dto/username.dto';
import { CursorDTO } from './dto/cursor.dto';
import { SearchUserOptionalDTO } from './dto/searchuser.dto';
import { AuthGuard } from '@nestjs/passport';
import { TokenGuard } from '../common/guard/token.guard';
import { UserThrottlerGuard } from '../common/guard/throttler.guard';

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

@ApiTags('Block')
@ApiBearerAuth()
@ApiCookieAuth()
@ApiUnauthorizedResponse({
  description:
    'Thiếu / token hết hạn / token đã bị thu hồi. Token có thể được gửi qua Authorization Bearer hoặc cookie.',
})
@ApiTooManyRequestsResponse({
  description: 'Gửi quá nhiều yêu cầu (rate limit).',
})
@Controller('block')
@UseGuards(AuthGuard('jwt'), TokenGuard, UserThrottlerGuard)
export class BlockController {
  constructor(private readonly blockService: BlockService) {}
  @HttpCode(HttpStatus.OK)
  @Post(':username')
  @ApiOperation({ summary: 'Chặn người dùng khác' })
  @ApiOkResponse({ description: 'Chặn người dùng thành công' })
  @ApiBadRequestResponse({
    description: 'Không thể chặn chính mình/ Đã chặn người dùng này trước đó',
  })
  @ApiNotFoundResponse({ description: 'Người dùng không tồn tại' })
  @ApiParam({
    name: 'username',
    required: true,
    description: 'Username của người dùng cần chặn',
    type: String,
  })
  async block(
    @CurrentUser() currentUser: AuthUser,
    @Param() usernameDTO: UsernameDTO,
  ) {
    // call service to block the user
    return await this.blockService.block(currentUser, usernameDTO.username);
  }

  @HttpCode(HttpStatus.OK)
  @Get()
  @ApiOperation({
    summary:
      'Lấy danh sách những người dùng mà người dùng hiện tại đã chặn, hỗ trợ tìm kiếm bằng từ khóa',
  })
  @ApiOkResponse({
    description:
      'Lấy danh sách người dùng đã chặn thành công, nếu không có thì trả về mảng rỗng',
  })
  @ApiBadRequestResponse({ description: 'Cursor không hợp lệ' })
  @ApiNotFoundResponse({ description: 'Người dùng không tồn tại' })
  @ApiQuery({
    name: 'cursor',
    required: false,
    description: 'Con trỏ để phân trang',
    type: String,
  })
  @ApiQuery({
    name: 'key',
    required: false,
    description: 'Từ khóa tìm kiếm theo username hoặc là tên hiển thị',
    type: String,
  })
  async getBlockedList(
    @CurrentUser() currentUser: AuthUser,
    @Query() searchUserDTO?: SearchUserOptionalDTO,
    @Query() cursorDTO?: CursorDTO,
  ) {
    return await this.blockService.getBlockedList(
      currentUser,
      searchUserDTO?.key?.trim(),
      cursorDTO?.cursor,
    );
  }

  @HttpCode(HttpStatus.OK)
  @Get('status/:username')
  @ApiOperation({
    summary: 'Lấy trạng thái chặn của mình đối với người dùng khác',
  })
  @ApiOkResponse({ description: 'Lấy trạng thái chặn thành công' })
  @ApiBadRequestResponse({
    description: 'Không thể lấy trạng thái của chính mình',
  })
  @ApiNotFoundResponse({ description: 'Người dùng không tồn tại' })
  @ApiParam({
    name: 'username',
    required: true,
    description: 'Username của người dùng cần lấy trạng thái',
    type: String,
  })
  async getBlockStatus(
    @CurrentUser() currentUser: AuthUser,
    @Param() usernameDTO: UsernameDTO,
  ) {
    return await this.blockService.getBlockStatus(
      currentUser,
      usernameDTO.username,
    );
  }

  @HttpCode(HttpStatus.OK)
  @Delete(':username')
  @ApiOperation({ summary: 'Gỡ chặn người dùng' })
  @ApiOkResponse({ description: 'Gỡ chặn người dùng thành công' })
  @ApiBadRequestResponse({
    description: 'Không thể gỡ chặn chính mình/ Chưa chặn người dùng này',
  })
  @ApiNotFoundResponse({ description: 'Người dùng không tồn tại' })
  @ApiParam({
    name: 'username',
    required: true,
    description: 'Username của người cần gỡ chặn',
    type: String,
  })
  async unblock(
    @CurrentUser() currentUser: AuthUser,
    @Param() usernameDTO: UsernameDTO,
  ) {
    // call service to unblock the user
    return await this.blockService.unblock(currentUser, usernameDTO.username);
  }
}
