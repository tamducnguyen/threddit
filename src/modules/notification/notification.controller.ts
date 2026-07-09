import { message } from '../../common/helper/message.helper';
import { ResponseMessage } from '../../common/decorator/response-message.decorator';
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
import { UserThrottlerGuard } from '../../common/guard/throttler.guard';
import { CursorDTO } from '../../common/dtos/cursor.dto';
import { ReadNotificationDTO } from './dtos/readnotification.dto';
import { SkipThrottle } from '@nestjs/throttler';
import { SessionGuard } from '../../common/guard/session.guard';
import { DeleteNotificationDTO } from './dtos/deletenotification.dto';

@Controller('notification')
@UseGuards(SessionGuard, UserThrottlerGuard)
@SkipThrottle({ public: true })
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}
  @Sse('listen')
  async createStream(@CurrentUser() currentUser: AuthUser) {
    return await this.notificationService.createStream(currentUser);
  }
  @ResponseMessage({
    no_content: message.notification.get_notification.no_content,
    success: message.notification.get_notification.success,
  })
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
  @ResponseMessage({
    no_content: message.notification.get_unread_notification.no_content,
    success: message.notification.get_unread_notification.success,
  })
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
  @ResponseMessage({ success: message.notification.read_notification.success })
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
  @ResponseMessage({
    success: message.notification.delete_notification.success,
  })
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
  @ResponseMessage({ success: message.notification.get_count_unread.success })
  @HttpCode(HttpStatus.OK)
  @Get('count/unread')
  async getCountUnreadNotification(@CurrentUser('sub') id: number) {
    return await this.notificationService.getCountUnreadNotification(id);
  }
  @ResponseMessage({
    success: message.notification.read_all_notifications.success,
  })
  @HttpCode(HttpStatus.OK)
  @Post('readall')
  async readAllNotifications(@CurrentUser() currentUser: AuthUser) {
    return await this.notificationService.readAllNotifications(currentUser);
  }
}
