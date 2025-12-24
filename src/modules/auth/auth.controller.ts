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
import { ResendVerifyDTO } from './dtos/resendverify.dto';
import { GoogleCodeDTO } from './dtos/googlecode.dto';

@Controller('auth')
@UseGuards(UserThrottlerGuard)
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly googleAuthService: GoogleAuthService,
  ) {}
  @HttpCode(HttpStatus.OK)
  @Post('signup')
  async signUp(@Body() signUpDTO: SignUpDTO) {
    return await this.authService.signUp(signUpDTO);
  }
  @HttpCode(HttpStatus.OK)
  @Post('verifyaccount')
  async verifyAccount(@Body() verifyAccountDTO: VerifyAccountDTO) {
    return await this.authService.verifyAccount(verifyAccountDTO);
  }
  @HttpCode(HttpStatus.OK)
  @Post('signin')
  async signIn(
    @Res({ passthrough: true }) res: Response,
    @Body() signInDTO: SignInDTO,
  ) {
    return await this.authService.signIn(res, signInDTO);
  }
  @HttpCode(HttpStatus.OK)
  @Post('resetpassword')
  async resetPassword(@Body() resetPasswordDTO: ResetPasswordDTO) {
    return await this.authService.resetPassword(resetPasswordDTO);
  }
  @HttpCode(HttpStatus.OK)
  @Post('verifyresetpassword')
  async verifyResetPassword(
    @Body() verifyResetPasswordDTO: VerifyResetPasswordDTO,
  ) {
    return await this.authService.verifyResetPassword(verifyResetPasswordDTO);
  }
  @HttpCode(HttpStatus.OK)
  @Post('resendverify')
  async resendVerify(@Body() resendVerifyDTO: ResendVerifyDTO) {
    return await this.authService.resendVerify(resendVerifyDTO);
  }
  @HttpCode(HttpStatus.OK)
  @Post('google')
  async googleCode(
    @Res({ passthrough: true }) res: Response,
    @Body() googleCodeDTO: GoogleCodeDTO,
  ) {
    return await this.googleAuthService.googleCode(res, googleCodeDTO);
  }
}
