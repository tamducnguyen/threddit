import { message } from '../../common/helper/message.helper';
import { ResponseMessage } from '../../common/decorator/response-message.decorator';
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
  @ResponseMessage({ success: message.account.signout.success })
  @HttpCode(HttpStatus.OK)
  @Post('signout')
  async signOut(
    @CurrentUser() currentUser: AuthUser,
    @AccessToken() accessToken: string,
  ) {
    return await this.accountService.signOut(currentUser, accessToken);
  }
  @ResponseMessage({ success: message.account.update_password.success })
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
  @ResponseMessage({ success: message.account.update_username.success })
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
  @ResponseMessage({ success: message.account.get_user_info.success })
  @HttpCode(HttpStatus.OK)
  @SkipThrottle({ write: true })
  @Get('getuserinfo')
  async getUserInfo(@CurrentUser() currentUser: AuthUser) {
    return await this.accountService.getUserInfo(currentUser);
  }
  @ResponseMessage({ mail_sent: message.account.delete_account.mail_sent })
  @HttpCode(HttpStatus.OK)
  @Post('deleteaccount/request')
  async requestDeleteAccount(@CurrentUser() currentUser: AuthUser) {
    return await this.accountService.requestDeleteAccount(currentUser);
  }
  @ResponseMessage({ success: message.account.delete_account.success })
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
