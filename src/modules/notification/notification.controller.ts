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
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCookieAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiProduces,
  ApiQuery,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

@ApiTags('Notification')
@ApiBearerAuth()
@ApiCookieAuth()
@ApiUnauthorizedResponse({
  description:
    'Không có access token hoặc hết hạn hoặc đã bị thu hồi,' +
    ' FE làm middleware bắt mã 401 -> cho người dùng đăng nhập lại' +
    'access token sẽ được nhận qua authorization bearer của header ' +
    'đối với web thì sẽ tự động lấy từ cookie',
})
@ApiTooManyRequestsResponse({
  description: 'Hạn chế gửi yêu cầu quá nhiều (ratelimit)',
})
@Controller('notification')
@UseGuards(AuthGuard('jwt'), TokenGuard, UserThrottlerGuard)
@SkipThrottle({ public: true })
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Sse('listen')
  @ApiOperation({
    summary: 'Lắng nghe thông báo thời gian thực (SSE)',
    description: `Thiết lập kết nối **Server-Sent Events** để nhận thông báo theo thời gian thực. **Lắng nghe ngay khi người dùng vào hệ thống**. 
      Kết nối được giữ mở và máy chủ sẽ chủ động đẩy sự kiện khi có thông báo mới thuộc về người dùng hiện tại.
      Mỗi sự kiện chứa thông tin của một thông báo (id, thời điểm tạo, trạng thái đã đọc, những thông tin đối tượng thông báo và thông điệp).`,
  })
  @ApiProduces('text/event-stream')
  @ApiOkResponse({
    description: `
      Thiết lập luồng SSE thành công.
      Kết nối sẽ trả về các sự kiện có định dạng sau:
      Chỉ bắt data
      id: 1
      data: {"id":21,"createdAt":"2025-10-09T14:06:21.226Z","type":"follow","target":{
              type: 'FRIEND_CONTENT_CREATION',
              contentId: 1,
              contentType: friend_content_creation,
              "actorUsername": "tamducnguyentest1",
              "actorAvatarUrl": "https://threddit-s3.s3.ap-southeast-1.amazonaws.com/avatar/default_avatar.jpg",
              "actorDisplayName": "Nguyễn Đức Tâm"
            },"isRead":false,"message":"tammmmm1 đã bắt đầu theo dõi bạn"}      
      Luồng sẽ tiếp tục gửi thêm các sự kiện mới cho đến khi người dùng ngắt kết nối.`,
  })
  @ApiBadRequestResponse({
    description:
      'Thất bại: không tìm thấy người dùng hoặc không thể khởi tạo luồng thông báo.',
  })
  async createStream(@CurrentUser() currentUser: AuthUser) {
    return await this.notificationService.createStream(currentUser);
  }

  @HttpCode(HttpStatus.OK)
  @Get()
  @ApiOperation({
    summary: 'Lấy danh sách thông báo (có phân trang bằng con trỏ)',
    description:
      '**Trả về danh sách thông báo của người dùng hiện tại theo thứ tự gần đây nhất. ' +
      'Hỗ trợ phân trang tiến bằng một mã con trỏ nằm trên query string. ' +
      'Người dùng kéo hết thì gọi api tiếp kèm theo cursor' +
      'Nếu không còn dữ liệu để trả về, máy chủ trả về mảng rỗng và con trỏ là null.**',
  })
  @ApiOkResponse({
    description:
      'Lấy thông báo thành công. Phản hồi bao gồm danh sách bản ghi và một mã con trỏ để tiếp tục tải trang sau.',
  })
  @ApiBadRequestResponse({
    description:
      'Thất bại: người dùng không hợp lệ hoặc mã con trỏ không hợp lệ',
  })
  @ApiQuery({
    name: 'cursor',
    required: false,
    description: 'Mã con trỏ để phân trang (JWT), có thể không điền',
    type: String,
  })
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
  @ApiOperation({
    summary: 'Lấy danh sách thông báo chưa đọc (có phân trang bằng con trỏ)',
    description:
      '**Trả về danh sách thông báo chưa đọc của người dùng hiện tại theo thứ tự gần đây nhất. ' +
      'Hỗ trợ phân trang tiến bằng một mã con trỏ nằm trên query string. ' +
      'Người dùng kéo hết thì gọi api tiếp kèm theo cursor' +
      'Nếu không còn dữ liệu để trả về, máy chủ trả về mảng rỗng và con trỏ là null .**',
  })
  @ApiOkResponse({
    description:
      'Lấy thông báo **chưa đọc** thành công. Phản hồi bao gồm danh sách bản ghi và một mã con trỏ để tiếp tục tải trang sau.',
  })
  @ApiBadRequestResponse({
    description:
      'Thất bại: người dùng không hợp lệ hoặc mã con trỏ không hợp lệ',
  })
  @ApiQuery({
    name: 'cursor',
    required: false,
    description: 'Mã con trỏ để phân trang (JWT), có thể không điền',
    type: String,
  })
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
  @ApiOperation({ summary: 'Chuyển trạng thái thông báo thành đã đọc.' })
  @ApiNotFoundResponse({
    description: 'Không có thông báo / Đã ở trạng thái đọc.',
  })
  @ApiOkResponse({
    description: 'Thành công chuyển trạng thái đã đọc của thông báo.',
  })
  @ApiParam({
    name: 'notificationId',
    required: true,
    description: 'Id của thông báo',
    type: String,
  })
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
  @ApiOperation({ summary: 'Xóa thông báo theo id của thông báo.' })
  @ApiNotFoundResponse({
    description: 'Không tìm thấy thông báo.',
  })
  @ApiOkResponse({
    description: 'Xóa thông báo thành công.',
  })
  @ApiParam({
    name: 'notificationId',
    required: true,
    description: 'ID của thông báo.',
    type: String,
  })
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
  @ApiOperation({ summary: 'Lấy số lượng thông báo chưa đọc.' })
  @ApiNotFoundResponse({ description: 'Không có người dùng.' })
  @ApiOkResponse({ description: 'Thành công lấy số lượng thông báo chưa đọc.' })
  async getCountUnreadNotification(@CurrentUser('sub') id: number) {
    return await this.notificationService.getCountUnreadNotificationount(id);
  }

  @HttpCode(HttpStatus.OK)
  @Post('readall')
  @ApiOperation({ summary: 'Đánh dấu tất cả thông báo là đã đọc' })
  @ApiOkResponse({
    description: 'Đánh dấu tất cả thông báo là đã đọc thành công',
  })
  async readAllNotifications(@CurrentUser() currentUser: AuthUser) {
    return await this.notificationService.readAllNotifications(currentUser);
  }
}
