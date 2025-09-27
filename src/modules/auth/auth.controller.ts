import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignUpDTO } from './dtos/signup.dto';
import { VerifyAccountDTO } from './dtos/verifyaccount.dto';
import { SignInDTO } from './dtos/signin.dto';
import { Response } from 'express';
import { ResetPasswordDTO } from './dtos/resetpassword.dto';
import { VerifyResetPasswordDTO } from './dtos/verifyresetpassword.dto';
import { UserThrottlerGuard } from '../common/guard/throttler.guard';
import { GoogleAuthService } from './google.service';
import { GoogleSignUpDTO } from './dtos/googlesignup.dto';
import { GoogleSignInDTO } from './dtos/googlesingin.dto';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';

@ApiTags('Auth')
@ApiTooManyRequestsResponse({
  description: 'Hạn chế gửi yêu cầu quá nhiều (ratelimit)',
})
@Controller('auth')
@UseGuards(UserThrottlerGuard)
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly googleAuthService: GoogleAuthService,
  ) {}
  @HttpCode(HttpStatus.OK)
  @Post('signup')
  @ApiOperation({
    summary: 'Đăng ký tài khoản mới',
    description:
      'Người dùng gửi email, username, mật khẩu để đăng ký. ' +
      'Hệ thống sẽ kiểm tra trùng lặp, lưu tạm thông tin và gửi mã xác minh qua email.',
  })
  @ApiOkResponse({
    description: 'Đăng ký thành công, hệ thống đã gửi mã xác minh qua email.',
  })
  @ApiBadRequestResponse({
    description:
      'Thất bại: email/username đã tồn tại, mật khẩu không khớp, gửi mail thất bại hoặc gửi mail quá nhiều lần 1 lần/60s, hoặc xác minh quá 5 lần.',
  })
  async signUp(@Body() signUpDTO: SignUpDTO) {
    return await this.authService.signUp(signUpDTO);
  }

  @HttpCode(HttpStatus.OK)
  @Post('verifyaccount')
  @ApiOperation({
    summary: 'Xác minh tài khoản',
    description:
      'Người dùng nhập email và mã xác minh nhận từ email. ' +
      'Hệ thống kiểm tra mã hợp lệ, tạo tài khoản chính thức và lưu thông tin vào database.',
  })
  @ApiOkResponse({
    description: 'Xác minh thành công, tài khoản đã được tạo.',
  })
  @ApiBadRequestResponse({
    description:
      'Thất bại: mã xác minh sai hoặc hết hạn, email đã được xác minh rồi, hoặc quá 5 lần thử phải chờ 5 phút để tiếp tục.',
  })
  async verifyAccount(@Body() verifyAccountDTO: VerifyAccountDTO) {
    return await this.authService.verifyAccount(verifyAccountDTO);
  }

  @HttpCode(HttpStatus.OK)
  @Post('signin')
  @ApiOperation({
    summary: 'Đăng nhập',
    description:
      'Xác thực email và mật khẩu. Nếu hợp lệ, hệ thống tạo access token, lưu session và gửi kèm cookie `accessToken` (HttpOnly) trong phản hồi đối với web và trả về body đối với mobile.',
  })
  @ApiOkResponse({
    description:
      'Đăng nhập thành công. Access token được trả về trong body và đồng thời được set vào cookie `accessToken` (HttpOnly). và trả về body đối với mobile.',
  })
  @ApiBadRequestResponse({
    description:
      'Đăng nhập thất bại: email không tồn tại hoặc mật khẩu không chính xác.',
  })
  async signIn(
    @Res({ passthrough: true }) res: Response,
    @Body() signInDTO: SignInDTO,
  ) {
    return await this.authService.signIn(res, signInDTO);
  }
  @HttpCode(HttpStatus.OK)
  @Post('resetpassword')
  @ApiOperation({
    summary: 'Yêu cầu đặt lại mật khẩu',
    description:
      'Người dùng nhập email. Hệ thống kiểm tra tồn tại ' +
      'tạo mã xác minh và gửi qua email để xác nhận đặt lại mật khẩu.',
  })
  @ApiOkResponse({
    description:
      'Gửi mã xác minh thành công. Mã đã được gửi vào email và lưu tạm.',
  })
  @ApiBadRequestResponse({
    description:
      'Thất bại: email không tồn tại, gửi mail thất bại, hoặc gửi mail quá nhiều lần 1 lần/60s ,đạt giới hạn lần thử xác minh mã.',
  })
  async resetPassword(@Body() resetPasswordDTO: ResetPasswordDTO) {
    return await this.authService.resetPassword(resetPasswordDTO);
  }

  @HttpCode(HttpStatus.OK)
  @Post('verifyresetpassword')
  @ApiOperation({
    summary: 'Xác minh và cập nhật mật khẩu mới',
    description:
      'Người dùng cung cấp email, mã xác minh, mật khẩu mới và xác nhận mật khẩu. ' +
      'Hệ thống kiểm tra mã hợp lệ còn hạn, khớp mật khẩu, cập nhật mật khẩu và hủy toàn bộ phiên đang đăng nhập.',
  })
  @ApiOkResponse({
    description:
      'Xác minh thành công và mật khẩu đã được cập nhật. Toàn bộ token cũ đã bị thu hồi. Người dùng phải đăng nhập lại',
  })
  @ApiBadRequestResponse({
    description:
      'Thất bại: mã xác minh sai hoặc hết hạn, email không tồn tại, mật khẩu mới và nhập lại mật khẩu không khớp, hoặc quá 5 lần thử (không cho thử trong 5 phút tiếp theo).',
  })
  async verifyResetPassword(
    @Body() verifyResetPasswordDTO: VerifyResetPasswordDTO,
  ) {
    return await this.authService.verifyResetPassword(verifyResetPasswordDTO);
  }
  @HttpCode(HttpStatus.OK)
  @Post('signup/google')
  @ApiOperation({
    summary: 'Đăng ký bằng Google',
    description:
      'Người dùng đăng ký tài khoản mới thông qua Google. ' +
      'Hệ thống sẽ nhận mã xác thực từ Google, kiểm tra tính hợp lệ và lấy thông tin email đã xác minh. ' +
      'Nếu email hoặc tên người dùng chưa tồn tại, hệ thống sẽ tạo tài khoản kèm theo hồ sơ liên kết Google.',
  })
  @ApiOkResponse({
    description: 'Đăng ký Google thành công.',
  })
  @ApiBadRequestResponse({
    description:
      'Thất bại: email đã tồn tại, tên người dùng đã tồn tại, hoặc mã Google không hợp lệ.',
  })
  async googleSignUp(@Body() googleSignUpDTO: GoogleSignUpDTO) {
    return await this.googleAuthService.googleSignUp(googleSignUpDTO);
  }

  @HttpCode(HttpStatus.OK)
  @Post('signin/google')
  @ApiOperation({
    summary: 'Đăng nhập bằng Google',
    description:
      'Người dùng đăng nhập bằng tài khoản Google. ' +
      'Hệ thống sẽ xác thực mã nhận được từ Google và tìm tài khoản đã được liên kết trước đó. ' +
      'Nếu hợp lệ, hệ thống sẽ tạo phiên đăng nhập, cấp access token và gửi lại cho người dùng qua body kèm cookie bảo mật.',
  })
  @ApiOkResponse({
    description:
      'Đăng nhập Google thành công. Access token được trả về lưu trong cookie bảo mật (HttpOnly) với web và body với mobile.',
  })
  @ApiBadRequestResponse({
    description:
      'Thất bại: tài khoản Google chưa được liên kết hoặc mã Google không hợp lệ.',
  })
  async googleSignIn(
    @Res({ passthrough: true }) response: Response,
    @Body() googleSignInDTO: GoogleSignInDTO,
  ) {
    return await this.googleAuthService.googleSignIn(response, googleSignInDTO);
  }
}
