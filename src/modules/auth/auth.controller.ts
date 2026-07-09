import { message } from '../../common/helper/message.helper';
import { ResponseMessage } from '../../common/decorator/response-message.decorator';
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
import { UserThrottlerGuard } from '../../common/guard/throttler.guard';
import { GoogleAuthService } from './google.service';
import { ResendVerifyDTO } from './dtos/resendverify.dto';
import { GoogleCodeDTO } from './dtos/googlecode.dto';
import { cookieOptions, sendCookie } from 'src/common/helper/cookie.helper';
import { ConfigService } from '@nestjs/config';

@Controller('auth')
@UseGuards(UserThrottlerGuard)
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly googleAuthService: GoogleAuthService,
    private readonly configService: ConfigService,
  ) {}
  @ResponseMessage({ success: message.auth.signup.success })
  @HttpCode(HttpStatus.OK)
  @Post('signup')
  async signUp(@Body() signUpDTO: SignUpDTO) {
    return await this.authService.signUp(signUpDTO);
  }
  @ResponseMessage({ success: message.auth.verify.success })
  @HttpCode(HttpStatus.OK)
  @Post('verifyaccount')
  async verifyAccount(@Body() verifyAccountDTO: VerifyAccountDTO) {
    return await this.authService.verifyAccount(verifyAccountDTO);
  }
  @ResponseMessage({ success: message.auth.signin.success })
  @HttpCode(HttpStatus.OK)
  @Post('signin')
  async signIn(
    @Res({ passthrough: true }) res: Response,
    @Body() signInDTO: SignInDTO,
  ) {
    const signInResponse = await this.authService.signIn(res, signInDTO);

    sendCookie(
      res,
      this.configService,
      cookieOptions.name.THREDDIT_AUTH,
      signInResponse.data?.THREDDIT_AUTH,
    );
    return signInResponse;
  }
  @ResponseMessage({ success: message.auth.reset_password.success })
  @HttpCode(HttpStatus.OK)
  @Post('resetpassword')
  async resetPassword(@Body() resetPasswordDTO: ResetPasswordDTO) {
    return await this.authService.resetPassword(resetPasswordDTO);
  }
  @ResponseMessage({ success: message.auth.verify_reset_password.success })
  @HttpCode(HttpStatus.OK)
  @Post('verifyresetpassword')
  async verifyResetPassword(
    @Body() verifyResetPasswordDTO: VerifyResetPasswordDTO,
  ) {
    return await this.authService.verifyResetPassword(verifyResetPasswordDTO);
  }
  @ResponseMessage({ success: message.auth.resend_verification_code.success })
  @HttpCode(HttpStatus.OK)
  @Post('resendverify')
  async resendVerify(@Body() resendVerifyDTO: ResendVerifyDTO) {
    return await this.authService.resendVerify(resendVerifyDTO);
  }
  @ResponseMessage({ success: message.auth.google_auth.success })
  @HttpCode(HttpStatus.OK)
  @Post('google')
  async googleCode(
    @Res({ passthrough: true }) res: Response,
    @Body() googleCodeDTO: GoogleCodeDTO,
  ) {
    return await this.googleAuthService.googleCode(res, googleCodeDTO);
  }
}
