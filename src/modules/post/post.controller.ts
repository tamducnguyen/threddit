import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Patch,
  Query,
  UseGuards,
  Sse,
} from '@nestjs/common';
import { PostService } from './post.service';
import { AuthGuard } from '@nestjs/passport';
import { UserThrottlerGuard } from '../common/guard/throttler.guard';
import { SkipThrottle } from '@nestjs/throttler';
import { CurrentUser } from '../token/currentuser.decorator';
import { UsernameDTO } from './dtos/username.dto';
import { CursorDTO } from '../post/dtos/cursor.dto';
import { TokenGuard } from '../common/guard/token.guard';
import { PostIdDTO } from './dtos/postid.dto';
import { CreatePostDTO } from './dtos/createpost.dto';
import { AuthUser } from '../token/authuser.interface';
import { VotePostDTO } from './dtos/votepost.dto';
import { UpdatePostDTO } from './dtos/updatepost.dto';
import { SearchPostDTO } from './dtos/searchpost.dto';
import { CreateCommentDTO } from './dtos/createcomment.dto';
import { DetailCommentDTO } from './dtos/detailcomment.dto';
import { UpdateCommentDTO } from './dtos/updatecomment.dto';

import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCookieAuth,
  ApiInternalServerErrorResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
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
    @CurrentUser() currentUser: AuthUser,
    @Query() cursorDTO?: CursorDTO,
  ) {
    return await this.postService.getCreatedPost(
      currentUser,
      currentUser.username,
      cursorDTO?.cursor,
    );
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
    @CurrentUser() currentUser: AuthUser,
    @Param() usernameDTO: UsernameDTO,
    @Query() cursorDTO?: CursorDTO,
  ) {
    return await this.postService.getCreatedPost(
      currentUser,
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
    @CurrentUser() currentUser: AuthUser,
    @Query() cursorDTO?: CursorDTO,
  ) {
    return await this.postService.getSavedPost(
      currentUser,
      currentUser.username,
      cursorDTO?.cursor,
    );
  }
  @HttpCode(HttpStatus.OK)
  @Post(':postId/pin')
  @ApiOperation({ summary: 'Ghim bài viết của bản thân' })
  @ApiOkResponse({ description: 'Ghim bài viết thành cong' })
  @ApiNotFoundResponse({
    description: 'Đã ghim bài viết / Bài viết không phải của người dùng',
  })
  @ApiParam({
    name: 'postId',
    required: true,
    description: 'Id bài viết',
  })
  async pinSelfPost(
    @CurrentUser('sub') currentUserId: string,
    @Param() postIdDTO: PostIdDTO,
  ) {
    return await this.postService.pinSelfPost(currentUserId, postIdDTO.postId);
  }
  @HttpCode(HttpStatus.OK)
  @Delete(':postId/pin')
  @ApiOkResponse({ description: 'Hủy ghim bài viết thành cong' })
  @ApiNotFoundResponse({
    description: 'Bài viết không phải của người dùng',
  })
  @ApiParam({
    name: 'postId',
    required: true,
    description: 'Id bài viết',
  })
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
  @ApiOperation({
    summary: 'Đăng tải bài viết ',
    description: 'Thông báo cho followers và những followers được đề cập',
  })
  @ApiOkResponse({ description: 'Đăng tải bài viết thành công' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy người dùng hiện tại' })
  @ApiBadRequestResponse({ description: 'Bài viết có ngôn từ độc hại ' })
  @ApiInternalServerErrorResponse({ description: 'Server AI timeout' })
  async createPost(
    @CurrentUser() currentUser: AuthUser,
    @Body() postDTO: CreatePostDTO,
  ) {
    return await this.postService.createPost(currentUser, postDTO);
  }
  @HttpCode(HttpStatus.OK)
  @Delete(':postId')
  @ApiOperation({ summary: 'Xóa bài viết (chủ bài viết mới có quyền xóa)' })
  @ApiOkResponse({ description: 'Xóa bài viết thành công' })
  @ApiNotFoundResponse({
    description:
      'Không tìm thấy người dùng hiện tại/ không tìm thấy bài viết của bạn',
  })
  @ApiParam({
    name: 'postId',
    required: true,
    description: 'Id bài viết',
  })
  async deletePost(
    @CurrentUser() currentUser: AuthUser,
    @Param() postIdDTO: PostIdDTO,
  ) {
    return await this.postService.deletePost(currentUser, postIdDTO);
  }
  @HttpCode(HttpStatus.OK)
  @Post(':postId/save')
  @ApiOperation({ summary: 'Lưu bài viết ' })
  @ApiOkResponse({ description: 'Lưu bài viết thành công' })
  @ApiBadRequestResponse({ description: 'Đã lưu bài viết ' })
  @ApiNotFoundResponse({
    description:
      'Không tìm thấy người dùng hiện tại / Không tìm thấy bài viết ',
  })
  @ApiParam({
    name: 'postId',
    required: true,
    description: 'Id bài viết',
  })
  async savePost(
    @CurrentUser() currentUser: AuthUser,
    @Param() postIdDTO: PostIdDTO,
  ) {
    return await this.postService.savePost(currentUser, postIdDTO);
  }
  @HttpCode(HttpStatus.OK)
  @Delete(':postId/save')
  @ApiOperation({ summary: 'Hủy lưu bài viết ' })
  @ApiOkResponse({ description: 'Hủy lưu bài viết thành công' })
  @ApiBadRequestResponse({ description: 'Chưa lưu bài viết ' })
  @ApiNotFoundResponse({
    description:
      'Không tìm thấy người dùng hiện tại / Không tìm thấy bài viết ',
  })
  @ApiParam({
    name: 'postId',
    required: true,
    description: 'Id bài viết',
  })
  async unsavePost(
    @CurrentUser() currentUser: AuthUser,
    @Param() postIdDTO: PostIdDTO,
  ) {
    return await this.postService.unsavePost(currentUser, postIdDTO);
  }
  @HttpCode(HttpStatus.OK)
  @Post(':postId/vote/:isUpvote')
  @ApiOperation({ summary: 'Bình chọn bài viết' })
  @ApiOkResponse({ description: 'Bình chọn bài viết thành công' })
  @ApiNotFoundResponse({
    description: 'Không tìm thấy người dùng hiện tại / Không tìm thấy bài viết',
  })
  @ApiBadRequestResponse({ description: 'Đã bình chọn kiểu này' })
  @ApiParam({
    name: 'postId',
    required: true,
    description: 'Id bài viết',
  })
  @ApiParam({
    name: 'isUpvote',
    required: true,
    description: 'trạng thái bình chọn',
  })
  async votePost(
    @CurrentUser() currentUser: AuthUser,
    @Param() votePostDTO: VotePostDTO,
  ) {
    return await this.postService.votePost(currentUser, votePostDTO);
  }
  @HttpCode(HttpStatus.OK)
  @Delete(':postId/vote')
  @ApiOperation({ summary: 'Hủy bình chọn bài viết' })
  @ApiOkResponse({ description: 'Hủy bình chọn bài viết thành công' })
  @ApiNotFoundResponse({
    description: 'Không tìm thấy người dùng hiện tại / Không tìm thấy bài viết',
  })
  @ApiBadRequestResponse({ description: 'Chưa bình chọn bài viết này' })
  @ApiParam({
    name: 'postId',
    required: true,
    description: 'Id bài viết',
  })
  async unvotePost(
    @CurrentUser() currentUser: AuthUser,
    @Param() postIdDTO: PostIdDTO,
  ) {
    return await this.postService.unvotePost(currentUser, postIdDTO);
  }
  @HttpCode(HttpStatus.OK)
  @Patch(':postId')
  @ApiOperation({
    summary: 'Cập nhật bài viết chính chủ',
    description: 'Cập nhật nội dung và người được đề cập',
  })
  @ApiOkResponse({
    description:
      'Cập nhập bài viết thành công, trả về bài viết đã cập nhật, thông báo cho người dùng mới được đề cập(nếu có)',
  })
  @ApiNotFoundResponse({ description: 'Không tìm thấy bài viết của bạn' })
  @ApiBadRequestResponse({
    description: 'Bài viết có ngôn từ nhạy cảm',
  })
  @ApiInternalServerErrorResponse({ description: 'Server AI timeout' })
  @ApiParam({
    name: 'postId',
    required: true,
    description: 'Id bài viết',
  })
  async updatePost(
    @CurrentUser() currentUser: AuthUser,
    @Param() postIdDTO: PostIdDTO,
    @Body() updatePostDTO: UpdatePostDTO,
  ) {
    return await this.postService.updatePost(
      currentUser,
      postIdDTO,
      updatePostDTO,
    );
  }
  @HttpCode(HttpStatus.OK)
  @Get('detail/:postId')
  @ApiOperation({
    summary: 'Lấy chi tiết bài viết',
    description:
      'Trả về thông tin của bài viết, trạng thái của người dùng hiện tại đối với bài viết',
  })
  @ApiOkResponse({ description: 'Lấy chi tiết bài viết thành công' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy bài viết' })
  @ApiParam({
    name: 'postId',
    required: true,
    description: 'Id bài viết',
  })
  async getPost(
    @CurrentUser() currentUser: AuthUser,
    @Param() postIdDTO: PostIdDTO,
  ) {
    return await this.postService.getPost(currentUser, postIdDTO);
  }
  @HttpCode(HttpStatus.OK)
  @Get('feed')
  @ApiOperation({
    summary: 'Lấy bảng tin',
    description:
      'Đề xuất dựa trên bình chọn, lượt lưu, số bình luận' +
      ', số người mà mà người dùng hiện tại theo dõi bình chọn cho bài viết ' +
      'Khi lấy bảng tin xong sẽ cache lại để tránh trùng lặp,' +
      ' tối đa cache 1000 bài viết mới nhất',
  })
  @ApiOkResponse({ description: 'Lấy bảng tin thành công, cache ' })
  @ApiNoContentResponse({
    description:
      'Đã lấy hết tất cả các bài viết,' +
      'chỉ xảy ra khi tổng số bài viết nhỏ hơn 1000',
  })
  async getFeed(@CurrentUser() currentUser: AuthUser) {
    return await this.postService.getFeed(currentUser);
  }
  @HttpCode(HttpStatus.OK)
  @Get('following')
  @ApiOperation({
    summary:
      'Lấy danh sách bài viết của những người mà người dùng đang theo dõi',
  })
  @ApiOkResponse({
    description:
      'Lấy danh sách thành công, trả về những bài viết theo thứ tự gần đây nhất',
  })
  @ApiNoContentResponse({
    description: 'Đã hết danh sách hoặc không có bài viết',
  })
  @ApiBadRequestResponse({ description: 'Con trỏ không hợp lệ' })
  @ApiQuery({
    name: 'cursor',
    required: false,
    description: 'Mã con trỏ để phân trang (JWT), có thể không điền',
    type: String,
  })
  async getFollowingPosts(
    @CurrentUser() currentUser: AuthUser,
    @Query() cursorDTO: CursorDTO,
  ) {
    return await this.postService.getFollowingPosts(
      currentUser,
      cursorDTO.cursor,
    );
  }
  @HttpCode(HttpStatus.OK)
  @Get('search')
  @ApiOperation({
    summary: 'Tìm kiếm bài viết bằng từ khóa',
  })
  @ApiOkResponse({
    description:
      'Lấy danh sách thành công, trả về những bài viết khớp với từ khóa và theo thứ tự gần đây nhất',
  })
  @ApiNoContentResponse({
    description: 'Đã hết danh sách hoặc không có bài viết',
  })
  @ApiBadRequestResponse({ description: 'Con trỏ không hợp lệ' })
  @ApiQuery({
    name: 'cursor',
    required: false,
    description: 'Mã con trỏ để phân trang (JWT), có thể không điền',
    type: String,
  })
  @ApiQuery({
    name: 'key',
    required: true,
    description: 'Từ khóa để tìm kiếm',
    type: String,
  })
  async getPostsByKey(
    @CurrentUser() currentUser: AuthUser,
    @Query() searchPostDTO: SearchPostDTO,
    @Query() cursorDTO: CursorDTO,
  ) {
    return await this.postService.getPostsByKey(
      currentUser,
      searchPostDTO,
      cursorDTO.cursor,
    );
  }
  @HttpCode(HttpStatus.OK)
  @Sse(':postId/comment/listen')
  @ApiOperation({
    summary: 'Lắng nghe bình luận trên bài viết',
  })
  @ApiParam({
    name: 'postId',
    required: true,
    type: String,
    description: 'Mã bài viết',
  })
  async listenComment(
    @Param() postIdDTO: PostIdDTO,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return await this.postService.listenComment(postIdDTO, currentUser);
  }
  @HttpCode(HttpStatus.OK)
  @Post(':postId/comment')
  @ApiOperation({ summary: 'Bình luận' })
  @ApiNotFoundResponse({
    description: 'Không tìm thấy người dùng hoặc không tìm thấy bài viết',
  })
  @ApiBadRequestResponse({ description: 'Xuất hiện ngôn từ nhạy cảm' })
  @ApiOkResponse({ description: 'Bình luận thành công' })
  @ApiParam({
    name: 'postId',
    required: true,
    type: String,
    description: 'Mã bài viết',
  })
  async createComment(
    @CurrentUser() currentUser: AuthUser,
    @Param() postIdDTO: PostIdDTO,
    @Body() createCommentDTO: CreateCommentDTO,
  ) {
    return await this.postService.createComment(
      currentUser,
      postIdDTO,
      createCommentDTO,
    );
  }
  @HttpCode(HttpStatus.OK)
  @Get(':postId/comment')
  @ApiOperation({ summary: 'Lấy danh sách bình luận của một bài viết' })
  @ApiNotFoundResponse({
    description: 'Không tìm thấy bài viết',
  })
  @ApiBadRequestResponse({ description: 'Con trỏ không hợp lệ' })
  @ApiNoContentResponse({
    description: 'Đã hết danh sách hoặc không có bài viêt',
  })
  @ApiOkResponse({ description: 'Lấy danh sách bình luận thành công' })
  @ApiParam({
    name: 'postId',
    required: true,
    type: String,
    description: 'Mã bài viết',
  })
  @ApiQuery({
    name: 'cursor',
    required: false,
    description: 'Mã con trỏ để phân trang (JWT), có thể không điền',
    type: String,
  })
  async getComment(
    @CurrentUser() currentUser: AuthUser,
    @Param() postIdDTO: PostIdDTO,
    @Query() cursorDTO: CursorDTO,
  ) {
    return await this.postService.getComments(
      currentUser,
      postIdDTO,
      cursorDTO.cursor,
    );
  }
  @HttpCode(HttpStatus.OK)
  @Get(':postId/comment/:commentId')
  @ApiOperation({ summary: 'Lấy chi tiết bình luận' })
  @ApiOkResponse({ description: 'Lấy thành công' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy bình luận' })
  @ApiParam({
    name: 'postId',
    required: true,
    type: String,
    description: 'Mã bài viết',
  })
  @ApiParam({
    name: 'commentId',
    required: true,
    type: String,
    description: 'Mã bình luận',
  })
  async getDetailComment(
    @CurrentUser() currentUser: AuthUser,
    @Param() detailCommentDTO: DetailCommentDTO,
  ) {
    return await this.postService.getDetailComment(
      currentUser,
      detailCommentDTO,
    );
  }
  @HttpCode(HttpStatus.OK)
  @Patch(':postId/comment/:commentId')
  @ApiOperation({ summary: 'Cập nhật bài viết' })
  @ApiOkResponse({ description: 'Cập nhật thành công' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy bình luận của bạn' })
  @ApiBadRequestResponse({ description: 'Xuất hiện ngôn từ nhạy cảm' })
  @ApiParam({
    name: 'postId',
    required: true,
    type: String,
    description: 'Mã bài viết',
  })
  @ApiParam({
    name: 'commentId',
    required: true,
    type: String,
    description: 'Mã bình luận',
  })
  async updateComment(
    @CurrentUser() currentUser: AuthUser,
    @Param() detailCommentDTO: DetailCommentDTO,
    @Body() updateCommentDTO: UpdateCommentDTO,
  ) {
    return await this.postService.updateComment(
      currentUser,
      detailCommentDTO,
      updateCommentDTO,
    );
  }
  @HttpCode(HttpStatus.OK)
  @Delete(':postId/comment/:commentId')
  @ApiOperation({ summary: 'Xóa bình luận' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy bình luận của bạn' })
  @ApiOkResponse({ description: 'Xóa bình luận thành công' })
  @ApiParam({
    name: 'postId',
    required: true,
    type: String,
    description: 'Mã bài viết',
  })
  @ApiParam({
    name: 'commentId',
    required: true,
    type: String,
    description: 'Mã bình luận',
  })
  async deleteComment(
    @CurrentUser() currentUser: AuthUser,
    @Param() detailCommentDTO: DetailCommentDTO,
  ) {
    return await this.postService.deleteComment(currentUser, detailCommentDTO);
  }
}
