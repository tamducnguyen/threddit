import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ProfileService } from './profile.service';
import { AuthGuard } from '@nestjs/passport';
import { TokenGuard } from '../common/guard/token.guard';
import { UserThrottlerGuard } from '../common/guard/throttler.guard';
import { CurrentUser } from '../token/currentuser.decorator';
import { AuthUser } from '../token/authuser.interface';
import { UsernameDTO } from './dtos/username.dto';
import { UpdateProfileDTO } from './dtos/updateprofile.dto';
import { AvatarPresignDTO } from './dtos/avatarpresign.dto';
import { AvatarConfirmDTO } from './dtos/avatarconfirm.dto';
import { BackgroundPresignDTO } from './dtos/backgroundpresign.dto';
import { BackgroundConfirmDTO } from './dtos/backgroundconfirm.dto';

@Controller('profile')
@UseGuards(AuthGuard('jwt'), TokenGuard, UserThrottlerGuard)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}
  @HttpCode(HttpStatus.OK)
  @Get()
  async getCurrentProfile(@CurrentUser() currentUser: AuthUser) {
    return await this.profileService.getProfile(currentUser);
  }
  @HttpCode(HttpStatus.OK)
  @Get('/:username')
  async getProfile(
    @CurrentUser() currentUser: AuthUser,
    @Param() usernameDTO?: UsernameDTO,
  ) {
    return await this.profileService.getProfile(currentUser, usernameDTO);
  }
  @HttpCode(HttpStatus.OK)
  @Post('avatar/presign')
  async requestAvatarPresignUrl(
    @CurrentUser() currentUser: AuthUser,
    @Body() avatarPresignDTO: AvatarPresignDTO,
  ) {
    return await this.profileService.requestAvatarPresignUrl(
      currentUser,
      avatarPresignDTO,
    );
  }
  @HttpCode(HttpStatus.OK)
  @Post('avatar/confirm')
  async confirmAvatarUpload(
    @CurrentUser() currentUser: AuthUser,
    @Body() avatarConfirmDTO: AvatarConfirmDTO,
  ) {
    return await this.profileService.confirmAvatarUpload(
      currentUser,
      avatarConfirmDTO,
    );
  }
  @HttpCode(HttpStatus.OK)
  @Post('background/presign')
  async requestBackgroundPresignUrl(
    @CurrentUser() currentUser: AuthUser,
    @Body() backgroundPresignDTO: BackgroundPresignDTO,
  ) {
    return await this.profileService.requestBackgroundPresignUrl(
      currentUser,
      backgroundPresignDTO,
    );
  }
  @HttpCode(HttpStatus.OK)
  @Post('background/confirm')
  async confirmBackgroundUpload(
    @CurrentUser() currentUser: AuthUser,
    @Body() backgroundConfirmDTO: BackgroundConfirmDTO,
  ) {
    return await this.profileService.confirmBackgroundUpload(
      currentUser,
      backgroundConfirmDTO,
    );
  }
  @HttpCode(HttpStatus.OK)
  @Patch('info')
  async updateProfle(
    @CurrentUser() currentUser: AuthUser,
    @Body() updateProfileDTO: UpdateProfileDTO,
  ) {
    return await this.profileService.updateProfile(
      currentUser,
      updateProfileDTO,
    );
  }
}
