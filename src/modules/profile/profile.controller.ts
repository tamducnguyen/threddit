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
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

@ApiTags('Profile')
@ApiBearerAuth()
@ApiCookieAuth()
@ApiTooManyRequestsResponse({
  description: 'Hạn chế gửi yêu cầu quá nhiều (ratelimit)',
})
@Controller('profile')
@UseGuards(AuthGuard('jwt'), TokenGuard, UserThrottlerGuard)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}
  @HttpCode(HttpStatus.OK)
  @Get()
  @ApiOperation({
    summary: 'Lấy thông tin profile của người dùng hiện tại',
    description:
      'Trả về thông tin profile của người dùng đang đăng nhập. ' +
      'Không cần truyền tham số.',
  })
  @ApiOkResponse({
    description: 'Lấy thông tin profile thành công.',
  })
  @ApiBadRequestResponse({
    description: 'Không tìm thấy người dùng.',
  })
  async getCurrentProfile(@CurrentUser() currentUser: AuthUser) {
    return await this.profileService.getSelfProfile(currentUser);
  }
  @HttpCode(HttpStatus.OK)
  @Get('/:username')
  @ApiOperation({
    summary: 'Lấy thông tin profile theo username',
    description:
      'Trả về thông tin profile dựa trên username. ' +
      'Nếu không tìm thấy người dùng thì trả lỗi.',
  })
  @ApiOkResponse({
    description: 'Lấy thông tin profile thành công.',
  })
  @ApiBadRequestResponse({
    description: 'Không tìm thấy người dùng.',
  })
  @ApiParam({
    name: 'username',
    required: true,
    description: 'Username của người dùng cần lấy thông tin.',
    type: String,
  })
  async getProfile(
    @CurrentUser() currentUser: AuthUser,
    @Param() usernameDTO: UsernameDTO,
  ) {
    return await this.profileService.getOtherProfile(
      currentUser,
      usernameDTO.username,
    );
  }
  @HttpCode(HttpStatus.OK)
  @Post('avatar/presign')
  @ApiOperation({
    summary: 'Yêu cầu presigned URL để upload avatar',
    description:
      'Bước 1/2 của quy trình cập nhật avatar. ' +
      'Kiểm tra contentLength ≤ 5MB (kích thước avatar tối đa) và trả về presigned data ' +
      'để client upload lên storage.',
  })
  @ApiOkResponse({
    description: 'Tạo presigned URL thành công.',
  })
  @ApiBadRequestResponse({
    description: 'contentLength vượt quá 5MB.',
  })
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
  @ApiOperation({
    summary: 'Xác nhận upload avatar',
    description:
      'Bước 2/2 của quy trình cập nhật avatar. ' +
      'Client gọi endpoint này sau khi upload xong lên presigned URL. ' +
      'Hệ thống kiểm tra key phải đúng định dạng `temp/avatar/{userId}`, ' +
      'kiểm tra object tồn tại và dung lượng ≤ 5MB, sau đó chuyển sang `avatar/{userId}` ' +
      'và cập nhật profile.',
  })
  @ApiOkResponse({
    description: 'Cập nhật avatar thành công.',
  })
  @ApiBadRequestResponse({
    description:
      'Sai key, file upload không tồn tại hoặc dung lượng vượt quá 5MB (file sẽ bị xóa).',
  })
  @ApiUnauthorizedResponse({
    description: 'Không tìm thấy người dùng.',
  })
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
  @ApiOperation({
    summary: 'Yêu cầu presigned URL để upload ảnh nền',
    description:
      'Bước 1/2 của quy trình cập nhật ảnh nền. ' +
      'Kiểm tra contentLength ≤ 5MB (kích thước ảnh nền tối đa) và trả về presigned data ' +
      'để client upload lên storage.',
  })
  @ApiOkResponse({
    description: 'Tạo presigned URL thành công.',
  })
  @ApiBadRequestResponse({
    description: 'contentLength vượt quá 5MB.',
  })
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
  @ApiOperation({
    summary: 'Xác nhận upload ảnh nền',
    description:
      'Bước 2/2 của quy trình cập nhật ảnh nền. ' +
      'Client gọi endpoint này sau khi upload xong lên presigned URL. ' +
      'Hệ thống kiểm tra key phải đúng định dạng `temp/background_image/{userId}`, ' +
      'kiểm tra object tồn tại và dung lượng ≤ 5MB, sau đó chuyển sang ' +
      '`background_image/{userId}` và cập nhật profile.',
  })
  @ApiOkResponse({
    description: 'Cập nhật ảnh nền thành công.',
  })
  @ApiBadRequestResponse({
    description:
      'Sai key, file upload không tồn tại hoặc dung lượng vượt quá 5MB (file sẽ bị xóa).',
  })
  @ApiUnauthorizedResponse({
    description: 'Không tìm thấy người dùng.',
  })
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
  @ApiOperation({
    summary: 'Cập nhật thông tin profile',
    description: 'Cập nhật tên hiển thị, giới tính hoặc ngày sinh.',
  })
  @ApiOkResponse({
    description: 'Cập nhật profile thành công.',
  })
  @ApiBadRequestResponse({
    description: 'Không có trường nào để cập nhật.',
  })
  @ApiUnauthorizedResponse({
    description: 'Không tìm thấy người dùng.',
  })
  async updateProfile(
    @CurrentUser() currentUser: AuthUser,
    @Body() updateProfileDTO: UpdateProfileDTO,
  ) {
    return await this.profileService.updateProfile(
      currentUser,
      updateProfileDTO,
    );
  }
}
