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
import { UserThrottlerGuard } from '../../common/guard/throttler.guard';
import { SessionGuard } from '../../common/guard/session.guard';
import { UpdatePasswordDTO } from './dtos/updatepassword.dto';
import { AuthUser } from '../token/authuser.interface';
import { CurrentUser } from '../token/currentuser.decorator';
import { UpdateUsernameDTO } from './dtos/updateusername.dto';
import { SkipThrottle } from '@nestjs/throttler';
import { DeleteAccountDTO } from './dtos/deleteaccount.dto';

@Controller('account')
@UseGuards(SessionGuard, UserThrottlerGuard)
@SkipThrottle({ public: true })
export class AccountController {
  constructor(private readonly accountService: AccountService) {}
  @HttpCode(HttpStatus.OK)
  @Post('signout')
  async signOut(
    @CurrentUser() currentUser: AuthUser,
    @AccessToken() accessToken: string,
  ) {
    return await this.accountService.signOut(currentUser, accessToken);
  }
  @HttpCode(HttpStatus.OK)
  @Post('updatepassword')
  async updatePassword(
    @CurrentUser() currentUser: AuthUser,
    @Body() updatePasswordDTO: UpdatePasswordDTO,
    @AccessToken() accessToken: string,
  ) {
    return await this.accountService.updatePassword(
      currentUser,
      updatePasswordDTO,
      accessToken,
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
  @HttpCode(HttpStatus.OK)
  @Post('deleteaccount/request')
  async requestDeleteAccount(@CurrentUser() currentUser: AuthUser) {
    return await this.accountService.requestDeleteAccount(currentUser);
  }
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
