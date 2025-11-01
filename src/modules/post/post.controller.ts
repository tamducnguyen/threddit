import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PostService } from './post.service';
import { AuthGuard } from '@nestjs/passport';
import { UserThrottlerGuard } from '../common/guard/throttler.guard';
import { SkipThrottle } from '@nestjs/throttler';
import { CurrentUser } from '../token/currentuser.decorator';
import { UsernameDTO } from './dtos/username.dto';
import { CursorDTO } from '../notification/dtos/cursor.dto';
import { TokenGuard } from '../common/guard/token.guard';
import { PostIdDTO } from './dtos/postid.dto';
import { PostDTO } from './dtos/createpost.dto';
import { AuthUser } from '../token/authuser.interface';
import { VotePostDTO } from './dtos/votepost.dto';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCookieAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
@ApiTags('Post')
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
@Controller('post')
@UseGuards(AuthGuard('jwt'), TokenGuard, UserThrottlerGuard)
@SkipThrottle({ public: true })
export class PostController {
  constructor(private readonly postService: PostService) {}
  @HttpCode(HttpStatus.OK)
  @Get('me/createdpost')
  @ApiOperation({
    summary:
      'Lấy danh sách bài viết đã tạo của **chính người dùng** (có phân trang bằng con trỏ)',
    description:
      '**Trả về danh sách bài viết đã tạo của người dùng hiện tại theo thứ tự gần đây nhất. ' +
      'Hỗ trợ phân trang tiến bằng một mã con trỏ nằm trên query string. ' +
      'Người dùng kéo hết thì gọi api tiếp kèm theo cursor' +
      'Nếu không còn dữ liệu để trả về, máy chủ có thể trả trạng thái không có nội dung.**',
  })
  @ApiOkResponse({
    description:
      'Lấy bài viết đã tạo thành công. Phản hồi bao gồm danh sách bản ghi và một mã con trỏ để tiếp tục tải trang sau.',
  })
  @ApiBadRequestResponse({
    description:
      'Thất bại: người dùng không hợp lệ hoặc mã con trỏ không hợp lệ',
  })
  @ApiNoContentResponse({
    description: 'Không có bài viết đã tạo / Đã lấy hết bài viết đã tạo',
  })
  @ApiQuery({
    name: 'cursor',
    required: false,
    description: 'Mã con trỏ để phân trang (JWT), có thể không điền',
    type: String,
  })
  async getSelfCreatedPost(
    @CurrentUser('username') username: string,
    @Query() cursorDTO?: CursorDTO,
  ) {
    return await this.postService.getCreatedPost(username, cursorDTO?.cursor);
  }
  @HttpCode(HttpStatus.OK)
  @Get(':username/createdpost')
  @ApiOperation({
    summary:
      'Lấy danh sách bài viết đã tạo dựa trên **tên người dùng** (có phân trang bằng con trỏ)',
    description:
      '**Trả về danh sách bài viết đã tạo của người dùng theo thứ tự gần đây nhất. ' +
      'Hỗ trợ phân trang tiến bằng một mã con trỏ nằm trên query string. ' +
      'Người dùng kéo hết thì gọi api tiếp kèm theo cursor' +
      'Nếu không còn dữ liệu để trả về, máy chủ có thể trả trạng thái không có nội dung.**',
  })
  @ApiOkResponse({
    description:
      'Lấy bài viết đã tạo thành công. Phản hồi bao gồm danh sách bản ghi và một mã con trỏ để tiếp tục tải trang sau.',
  })
  @ApiBadRequestResponse({
    description:
      'Thất bại: người dùng không hợp lệ hoặc mã con trỏ không hợp lệ',
  })
  @ApiNoContentResponse({
    description: 'Không có bài viết đã tạo / Đã lấy hết bài viết đã tạo',
  })
  @ApiQuery({
    name: 'cursor',
    required: false,
    description: 'Mã con trỏ để phân trang (JWT), có thể không điền',
    type: String,
  })
  @ApiParam({
    name: 'username',
    required: true,
    description: 'Tên người dùng',
    type: String,
  })
  async getUserCreatedPost(
    @Param() usernameDTO: UsernameDTO,
    @Query() cursorDTO?: CursorDTO,
  ) {
    return await this.postService.getCreatedPost(
      usernameDTO.username,
      cursorDTO?.cursor,
    );
  }
  @HttpCode(HttpStatus.OK)
  @Get('me/savedpost')
  @ApiOperation({
    summary:
      'Lấy danh sách bài viết đã lưu của **chính người dùng** (có phân trang bằng con trỏ)',
    description:
      '**Trả về danh sách bài viết đã lưu của người dùng hiện tại theo thứ tự gần đây nhất. ' +
      'Hỗ trợ phân trang tiến bằng một mã con trỏ nằm trên query string. ' +
      'Người dùng kéo hết thì gọi api tiếp kèm theo cursor' +
      'Nếu không còn dữ liệu để trả về, máy chủ có thể trả trạng thái không có nội dung.**',
  })
  @ApiOkResponse({
    description:
      'Lấy bài viết đã lưu thành công. Phản hồi bao gồm danh sách bản ghi và một mã con trỏ để tiếp tục tải trang sau.',
  })
  @ApiBadRequestResponse({
    description:
      'Thất bại: người dùng không hợp lệ hoặc mã con trỏ không hợp lệ',
  })
  @ApiNoContentResponse({
    description: 'Không có bài viết đã lưu / Đã lấy hết bài viết đã lưu',
  })
  @ApiQuery({
    name: 'cursor',
    required: false,
    description: 'Mã con trỏ để phân trang (JWT), có thể không điền',
    type: String,
  })
  async getSavedPost(
    @CurrentUser('username') username: string,
    @Query() cursorDTO?: CursorDTO,
  ) {
    return await this.postService.getSavedPost(username, cursorDTO?.cursor);
  }
  @HttpCode(HttpStatus.OK)
  @Post(':postId/pin')
  async pinSelfPost(
    @CurrentUser('sub') currentUserId: string,
    @Param() postIdDTO: PostIdDTO,
  ) {
    return await this.postService.pinSelfPost(currentUserId, postIdDTO.postId);
  }
  @HttpCode(HttpStatus.OK)
  @Delete(':postId/pin')
  async unpinSelfPost(
    @CurrentUser('sub') currentUserId: string,
    @Param() postIdDTO: PostIdDTO,
  ) {
    return await this.postService.unpinSelfPost(
      currentUserId,
      postIdDTO.postId,
    );
  }
  @HttpCode(HttpStatus.OK)
  @Post()
  async createPost(
    @CurrentUser() currentUser: AuthUser,
    @Body() postDTO: PostDTO,
  ) {
    return await this.postService.createPost(currentUser, postDTO);
  }
  @HttpCode(HttpStatus.OK)
  @Delete(':postId')
  async deletePost(
    @CurrentUser() currentUser: AuthUser,
    @Param() postIdDTO: PostIdDTO,
  ) {
    return await this.postService.deletePost(currentUser, postIdDTO);
  }
  @HttpCode(HttpStatus.OK)
  @Post(':postId/save')
  async savePost(
    @CurrentUser() currentUser: AuthUser,
    @Param() postIdDTO: PostIdDTO,
  ) {
    return await this.postService.savePost(currentUser, postIdDTO);
  }
  @HttpCode(HttpStatus.OK)
  @Delete(':postId/save')
  async unsavePost(
    @CurrentUser() currentUser: AuthUser,
    @Param() postIdDTO: PostIdDTO,
  ) {
    return await this.postService.unsavePost(currentUser, postIdDTO);
  }
  @HttpCode(HttpStatus.OK)
  @Post(':postId/vote/:isUpvote')
  async votePost(
    @CurrentUser() currentUser: AuthUser,
    @Param() votePostDTO: VotePostDTO,
  ) {
    return await this.postService.votePost(currentUser, votePostDTO);
  }
  @HttpCode(HttpStatus.OK)
  @Delete(':postId/vote')
  async unvotePost(
    @CurrentUser() currentUser: AuthUser,
    @Param() postIdDTO: PostIdDTO,
  ) {
    return await this.postService.unvotePost(currentUser, postIdDTO);
  }
}
