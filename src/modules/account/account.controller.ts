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

@Controller('account')
@UseGuards(AuthGuard('jwt'), TokenGuard, UserThrottlerGuard)
@SkipThrottle({ public: true })
export class AccountController {
  constructor(private readonly accountService: AccountService) {}
  @HttpCode(HttpStatus.OK)
  @Post('signout')
  async signOut(@AccessToken() accessToken: string) {
    return await this.accountService.signOut(accessToken);
  }
  @HttpCode(HttpStatus.OK)
  @Post('updatepassword')
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
  async getUserInfo(@CurrentUser() currentUser: AuthUser) {
    return await this.accountService.getUserInfo(currentUser);
  }
}
