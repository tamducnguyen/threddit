import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AccountService } from './account.service';
import { AccessToken } from '../token/accesstoken.decorator';
import { AuthGuard } from '@nestjs/passport';
import { UserThrottlerGuard } from '../common/guard/throttler.guard';
import { TokenGuard } from '../common/guard/token.guard';
import { UpdatePasswordDTO } from './dtos/updatepassword.dto';
import { AuthUser } from '../token/authuser.interface';
import { CurrentUser } from '../token/currentuser.decorator';
import { UpdateUsernameDTO } from './dtos/updateusername.dto';
import { SkipThrottle } from '@nestjs/throttler';
import { DeleteAccountDTO } from './dtos/deleteaccount.dto';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

@ApiTags('Account')
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
@Controller('account')
@UseGuards(AuthGuard('jwt'), TokenGuard, UserThrottlerGuard)
@SkipThrottle({ public: true })
export class AccountController {
  constructor(private readonly accountService: AccountService) {}
  @HttpCode(HttpStatus.OK)
  @Post('signout')
  @ApiOperation({
    summary: 'Đăng xuất',
    description:
      'Hủy phiên đăng nhập hiện tại của người dùng. Sau khi thực hiện, access token gắn với phiên này không còn hiệu lực.',
  })
  @ApiOkResponse({
    description: 'Đăng xuất thành công. Phiên hiện tại đã bị hủy.',
  })
  async signOut(@AccessToken() accessToken: string) {
    return await this.accountService.signOut(accessToken);
  }

  @HttpCode(HttpStatus.OK)
  @Post('updatepassword')
  @ApiOperation({
    summary: 'Đổi mật khẩu',
    description:
      'Cho phép người dùng đã xác thực đổi mật khẩu.' +
      ' Hệ thống kiểm tra mật khẩu hiện tại, xác nhận mật khẩu mới,' +
      'và thu hồi toàn bộ phiên đang hoạt động sau khi cập nhật.',
  })
  @ApiOkResponse({
    description:
      'Đổi mật khẩu thành công. Tất cả phiên cũ bị thu hồi để đảm bảo an toàn.',
  })
  @ApiBadRequestResponse({
    description:
      'Thất bại: mật khẩu cũ không đúng, mật khẩu mới trùng với mật khẩu cũ, không phải là mật khẩu mạnh' +
      ' hoặc xác nhập mật khẩu mới không khớp./ Sai phương thức đăng nhập',
  })
  async updatePassword(
    @CurrentUser() currentUser: AuthUser,
    @Body() updatePasswordDTO: UpdatePasswordDTO,
  ) {
    return await this.accountService.updatePassword(
      currentUser,
      updatePasswordDTO,
    );
  }

  @HttpCode(HttpStatus.OK)
  @Post('updateusername')
  @ApiOperation({
    summary: 'Đổi tên người dùng',
    description:
      'Cập nhật người dùng đã xác thực. Hệ thống sẽ kiểm tra trùng lặp trước khi cập nhật.',
  })
  @ApiOkResponse({
    description: 'Cập nhật tên người dùng thành công.',
  })
  @ApiBadRequestResponse({
    description: 'Thất bại: tên người dùng đã được sử dụng.',
  })
  async updateUsername(
    @CurrentUser() currentUser: AuthUser,
    @Body() updateUsernameDTO: UpdateUsernameDTO,
  ) {
    return await this.accountService.updateUsername(
      currentUser,
      updateUsernameDTO,
    );
  }

  @HttpCode(HttpStatus.OK)
  @SkipThrottle({ write: true })
  @Get('getuserinfo')
  @ApiOperation({
    summary: 'Lấy thông tin tài khoản',
    description: 'Trả về thông tin hồ sơ của người dùng đã xác thực.',
  })
  @ApiOkResponse({
    description: 'Lấy thông tin người dùng thành công.',
  })
  @ApiBadRequestResponse({
    description: 'Thất bại: không tìm thấy người dùng.',
  })
  async getUserInfo(@CurrentUser() currentUser: AuthUser) {
    return await this.accountService.getUserInfo(currentUser);
  }
  @ApiOperation({
    summary: 'Yêu cầu xóa tài khoản (gửi mã xác minh qua email)',
    description:
      'Gửi mã xác minh xóa tài khoản về email của người dùng đang đăng nhập. ' +
      'Có giới hạn số lần thử (tối đa 5) và chống spam gửi mail theo TTL.',
  })
  @ApiOkResponse({ description: 'Đã gửi mail mã xác minh xóa tài khoản' })
  @ApiBadRequestResponse({
    description:
      'Có thể xảy ra: không tìm thấy user, quá nhiều lần yêu cầu, bị throttle do vừa gửi mail, gửi mail thất bại.',
  })
  @HttpCode(HttpStatus.OK)
  @Post('deleteaccount/request')
  async requestDeleteAccount(@CurrentUser() currentUser: AuthUser) {
    return await this.accountService.requestDeleteAccount(currentUser);
  }
  @ApiOperation({
    summary: 'Xác minh xóa tài khoản',
    description:
      'Nhập mã xác minh đã gửi qua email để xóa tài khoản. ' +
      'Giới hạn số lần thử (tối đa 5). Nếu mã đúng: xóa user và toàn bộ session, đồng thời dọn cache liên quan.',
  })
  @ApiOkResponse({ description: 'Xác minh thành công và đã xóa tài khoản' })
  @ApiBadRequestResponse({
    description:
      'Có thể xảy ra: không tìm thấy user, quá nhiều lần thử, mã không hợp lệ/hết hạn.',
  })
  @HttpCode(HttpStatus.OK)
  @Post('deleteaccount/verify')
  async verifyDeleteAccount(
    @CurrentUser() currentUser: AuthUser,
    @Body() deleteAccountDTO: DeleteAccountDTO,
  ) {
    return await this.accountService.verifyDeleteAccount(
      currentUser,
      deleteAccountDTO,
    );
  }
}
