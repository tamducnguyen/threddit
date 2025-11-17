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

@Controller('post')
@UseGuards(AuthGuard('jwt'), TokenGuard, UserThrottlerGuard)
@SkipThrottle({ public: true })
export class PostController {
  constructor(private readonly postService: PostService) {}
  @HttpCode(HttpStatus.OK)
  @Get('me/createdpost')
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
    @Body() postDTO: CreatePostDTO,
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
  @HttpCode(HttpStatus.OK)
  @Patch(':postId')
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
  async getPost(
    @CurrentUser() currentUser: AuthUser,
    @Param() postIdDTO: PostIdDTO,
  ) {
    return await this.postService.getPost(currentUser, postIdDTO);
  }
  @HttpCode(HttpStatus.OK)
  @Get('feed')
  async getFeed(@CurrentUser() currentUser: AuthUser) {
    return await this.postService.getFeed(currentUser);
  }
  @HttpCode(HttpStatus.OK)
  @Get('following')
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
  async listenComment(
    @Param() postIdDTO: PostIdDTO,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return await this.postService.listenComment(postIdDTO, currentUser);
  }
  @HttpCode(HttpStatus.OK)
  @Post(':postId/comment')
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
  async deleteComment(
    @CurrentUser() currentUser: AuthUser,
    @Param() detailCommentDTO: DetailCommentDTO,
  ) {
    return await this.postService.deleteComment(currentUser, detailCommentDTO);
  }
}
