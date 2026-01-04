import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Sse,
  UseGuards,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { CurrentUser } from '../token/currentuser.decorator';
import { AuthUser } from '../token/authuser.interface';
import { AuthGuard } from '@nestjs/passport';
import { UserThrottlerGuard } from '../common/guard/throttler.guard';
import { CursorDTO } from './dtos/cursor.dto';
import { ReadNotificationDTO } from './dtos/readnotification.dto';
import { SkipThrottle } from '@nestjs/throttler';
import { TokenGuard } from '../common/guard/token.guard';
import { DeleteNotificationDTO } from './dtos/deletenotification.dto';

@Controller('notification')
@UseGuards(AuthGuard('jwt'), TokenGuard, UserThrottlerGuard)
@SkipThrottle({ public: true })
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}
  @Sse('listen')
  async createStream(@CurrentUser() currentUser: AuthUser) {
    return await this.notificationService.createStream(currentUser);
  }
  @HttpCode(HttpStatus.OK)
  @Get()
  async getNotification(
    @CurrentUser() currentUser: AuthUser,
    @Query() cursorDTO?: CursorDTO,
  ) {
    return await this.notificationService.getNotification(
      currentUser,
      cursorDTO?.cursor,
    );
  }
  @HttpCode(HttpStatus.OK)
  @Get('unread')
  async getUnreadNotification(
    @CurrentUser() currentUser: AuthUser,
    @Query() cursorDTO?: CursorDTO,
  ) {
    return await this.notificationService.getUnreadNotification(
      currentUser,
      cursorDTO?.cursor,
    );
  }
  @HttpCode(HttpStatus.OK)
  @Post(':notificationId/read')
  async readNotification(
    @CurrentUser('sub') sub: number,
    @Param() readnotifDTO: ReadNotificationDTO,
  ) {
    return await this.notificationService.readNotification(
      sub,
      readnotifDTO.notificationId,
    );
  }
  @HttpCode(HttpStatus.OK)
  @Delete(':notificationId')
  async deleteNotification(
    @CurrentUser('sub') sub: number,
    @Param() deleteNotificationDTO: DeleteNotificationDTO,
  ) {
    return await this.notificationService.deleteNotification(
      sub,
      deleteNotificationDTO.notificationId,
    );
  }
  @HttpCode(HttpStatus.OK)
  @Get('count/unread')
  async getCountUnreadNotification(@CurrentUser('sub') id: number) {
    return await this.notificationService.getCountUnreadNotificationount(id);
  }
  @HttpCode(HttpStatus.OK)
  @Post('readall')
  async readAllNotifications(@CurrentUser() currentUser: AuthUser) {
    return await this.notificationService.readAllNotifications(currentUser);
  }
}
