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

import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCookieAuth,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
@ApiTags('Follow')
@ApiBearerAuth()
@ApiCookieAuth()
@ApiUnauthorizedResponse({
  description:
    'Không có access token hoặc hết hạn hoặc đã bị thu hồi,' +
    ' FE làm middleware bắt mã 401 -> cho người dùng đăng nhập lại' +
    'access token sẽ được nhận qua authorization bearer của header ' +
    'đối với web thì sẽ tự động lấy từ cookie',
})
@ApiTooManyRequestsResponse({
  description: 'Hạn chế gửi yêu cầu quá nhiều (ratelimit)',
})
@Controller('follow')
@UseGuards(AuthGuard('jwt'), TokenGuard, UserThrottlerGuard)
export class FollowController {
  constructor(private readonly followService: FollowService) {}
  @HttpCode(HttpStatus.OK)
  @Get('me/count')
  @ApiOperation({
    summary: 'Lấy số người theo dõi và đang theo dõi của **chính người dùng**',
    description:
      'Trả về tổng số tài khoản đang theo dõi và tổng số tài khoản được theo dõi của người dùng hiện tại. ',
  })
  @ApiOkResponse({
    description: 'Lấy số lượng theo dõi thành công.',
  })
  @ApiNotFoundResponse({
    description: 'Không tìm thấy người dùng.',
  })
  async getMyFollowNumber(@CurrentUser('username') username: string) {
    return await this.followService.getFollowNumber(username);
  }
  @HttpCode(HttpStatus.OK)
  @Get(':username/count')
  @ApiOperation({
    summary: 'Lấy số người theo dõi và đang theo dõi **theo tên người dùng**',
    description:
      'Trả về tổng số tài khoản đang theo dõi và tổng số tài khoản được theo dõi của người dùng. ',
  })
  @ApiOkResponse({
    description: 'Lấy số lượng theo dõi thành công.',
  })
  @ApiNotFoundResponse({
    description: 'Không tìm thấy người dùng.',
  })
  @ApiParam({
    name: 'username',
    required: true,
    description: 'Tên người dùng',
    type: String,
  })
  async getUserFollowNumber(@Param() usernameDTO: UsernameDTO) {
    return await this.followService.getFollowNumber(usernameDTO.username);
  }
  @HttpCode(HttpStatus.OK)
  @Get('me/followers')
  @ApiOperation({
    summary:
      'Lấy danh sách người theo dõi của **chính người dùng** (có phân trang bằng con trỏ)',
    description:
      '**Trả về danh sách người theo dõi của người dùng hiện tại theo thứ tự gần đây nhất. ' +
      'Hỗ trợ phân trang tiến bằng một mã con trỏ nằm trên query string. ' +
      'Người dùng kéo hết thì gọi api tiếp kèm theo cursor' +
      'Nếu không còn dữ liệu để trả về, máy chủ có thể trả trạng thái không có nội dung.**',
  })
  @ApiOkResponse({
    description:
      'Lấy danh sách người theo dõi thành công. Phản hồi bao gồm danh sách bản ghi và một mã con trỏ để tiếp tục tải trang sau.',
  })
  @ApiBadRequestResponse({
    description:
      'Thất bại: người dùng không hợp lệ hoặc mã con trỏ không hợp lệ',
  })
  @ApiNoContentResponse({
    description: 'Không có người theo dõi / Đã lấy hết người theo dõi',
  })
  @ApiQuery({
    name: 'cursor',
    required: false,
    description: 'Mã con trỏ để phân trang (JWT), có thể không điền',
    type: String,
  })
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
  @ApiOperation({
    summary:
      'Lấy danh sách người theo dõi **dựa trên tên người dùng** (có phân trang bằng con trỏ)',
    description:
      '**Trả về danh sách người theo dõi của người dùng theo thứ tự gần đây nhất. ' +
      'Hỗ trợ phân trang tiến bằng một mã con trỏ nằm trên query string. ' +
      'Người dùng kéo hết thì gọi api tiếp kèm theo cursor' +
      'Nếu không còn dữ liệu để trả về, máy chủ có thể trả trạng thái không có nội dung.**',
  })
  @ApiOkResponse({
    description:
      'Lấy danh sách người theo dõi thành công. Phản hồi bao gồm danh sách bản ghi và một mã con trỏ để tiếp tục tải trang sau.',
  })
  @ApiBadRequestResponse({
    description:
      'Thất bại: người dùng không hợp lệ hoặc mã con trỏ không hợp lệ',
  })
  @ApiNoContentResponse({
    description: 'Không có người theo dõi / Đã lấy hết người theo dõi',
  })
  @ApiParam({
    name: 'username',
    required: true,
    description: 'Tên người dùng',
    type: String,
  })
  @ApiQuery({
    name: 'cursor',
    required: false,
    description: 'Mã con trỏ để phân trang (JWT), có thể không điền',
    type: String,
  })
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
  @ApiOperation({
    summary:
      'Lấy danh sách người đang theo dõi của **chính người dùng** (có phân trang bằng con trỏ)',
    description:
      '**Trả về danh sách người đang theo dõi của người dùng hiện tại theo thứ tự gần đây nhất. ' +
      'Hỗ trợ phân trang tiến bằng một mã con trỏ nằm trên query string. ' +
      'Người dùng kéo hết thì gọi api tiếp kèm theo cursor' +
      'Nếu không còn dữ liệu để trả về, máy chủ có thể trả trạng thái không có nội dung.**',
  })
  @ApiOkResponse({
    description:
      'Lấy danh sách người đang theo dõi thành công. Phản hồi bao gồm danh sách bản ghi và một mã con trỏ để tiếp tục tải trang sau.',
  })
  @ApiBadRequestResponse({
    description:
      'Thất bại: người dùng không hợp lệ hoặc mã con trỏ không hợp lệ',
  })
  @ApiNoContentResponse({
    description:
      'Không có người đang theo dõi / Đã lấy hết người đang theo dõi',
  })
  @ApiQuery({
    name: 'cursor',
    required: false,
    description: 'Mã con trỏ để phân trang (JWT), có thể không điền',
    type: String,
  })
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
  @ApiOperation({
    summary:
      'Lấy danh sách người đang theo dõi dựa trên **tên người dùng** (có phân trang bằng con trỏ)',
    description:
      '**Trả về danh sách người đang theo dõi của người dùng theo thứ tự gần đây nhất. ' +
      'Hỗ trợ phân trang tiến bằng một mã con trỏ nằm trên query string. ' +
      'Người dùng hiện tại kéo hết thì gọi api tiếp kèm theo cursor' +
      'Nếu không còn dữ liệu để trả về, máy chủ có thể trả trạng thái không có nội dung.**',
  })
  @ApiOkResponse({
    description:
      'Lấy danh sách người đang theo dõi thành công. Phản hồi bao gồm danh sách bản ghi và một mã con trỏ để tiếp tục tải trang sau.',
  })
  @ApiBadRequestResponse({
    description:
      'Thất bại: người dùng không hợp lệ hoặc mã con trỏ không hợp lệ',
  })
  @ApiNoContentResponse({
    description:
      'Không có người đang theo dõi / Đã lấy hết người đang theo dõi',
  })
  @ApiParam({
    name: 'username',
    required: true,
    description: 'Tên người dùng',
    type: String,
  })
  @ApiQuery({
    name: 'cursor',
    required: false,
    description: 'Mã con trỏ để phân trang (JWT), có thể không điền',
    type: String,
  })
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
  @ApiOperation({ summary: 'Theo dõi người dùng' })
  @ApiOkResponse({ description: 'Đã theo dõi người dùng thành công' })
  @ApiBadRequestResponse({
    description: 'Không thể follow chính mình / Đã theo dõi trước đó',
  })
  @ApiNotFoundResponse({ description: 'Người dùng không hợp lệ' })
  @ApiParam({
    name: 'username',
    required: true,
    description: 'Tên người dùng',
    type: String,
  })
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
  @ApiOperation({ summary: 'Hủy theo dõi người dùng' })
  @ApiOkResponse({ description: 'Đã hủy theo dõi người dùng thành công' })
  @ApiBadRequestResponse({
    description: ' Chưa theo dõi người dùng',
  })
  @ApiNotFoundResponse({ description: 'Người dùng không hợp lệ' })
  @ApiParam({
    name: 'username',
    required: true,
    description: 'Tên người dùng',
    type: String,
  })
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
  @ApiOperation({
    summary:
      'Lấy thông tin người dùng và trạng thái theo dõi đối với người dùng hiện tại',
  })
  @ApiOkResponse({
    description: 'Lấy thông tin người dùng và trạng thái theo dõi thành công',
  })
  @ApiNotFoundResponse({ description: 'Người dùng không hợp lệ' })
  @ApiParam({
    name: 'username',
    required: true,
    description: 'Tên người dùng',
    type: String,
  })
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
  @ApiOperation({ summary: 'Tìm kiếm người dùng theo từ khóa ' })
  @ApiOkResponse({
    description:
      'Tìm kiếm người dùng thành công, trả về danh sách người dùng khớp với kết quả tìm kiếm',
  })
  @ApiNoContentResponse({
    description: 'Không có kết quả nào khớp hoặc là đã hết danh sách',
  })
  @ApiBadRequestResponse({ description: 'Con trỏ không hợp lệ' })
  @ApiQuery({
    name: 'key',
    required: true,
    description: 'Từ khóa để tìm kiếm',
  })
  @ApiQuery({
    name: 'cursor',
    required: false,
    description: 'Con trỏ để phân trang cuộn',
  })
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
