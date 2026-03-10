import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CommentService } from './comment.service';
import { AuthGuard } from '@nestjs/passport';
import { TokenGuard } from '../common/guard/token.guard';
import { UserThrottlerGuard } from '../common/guard/throttler.guard';
import { SkipThrottle } from '@nestjs/throttler';
import { CurrentUser } from '../token/currentuser.decorator';
import { AuthUser } from '../token/authuser.interface';
import { ContentIdDTO } from '../content/dtos/content-id.dto';
import { CursorDTO } from '../content/dtos/cursor.dto';
import { CommentContentDTO } from './dtos/comment-content.dto';
import { CommentIdDTO } from './dtos/comment-id.dto';
import { UpdateCommentDTO } from './dtos/update-comment.dto';

@Controller('content')
@UseGuards(AuthGuard('jwt'), TokenGuard, UserThrottlerGuard)
@SkipThrottle({ public: true })
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @HttpCode(HttpStatus.OK)
  @Post(':contentId/comment')
  async commentContent(
    @CurrentUser() currentUser: AuthUser,
    @Param() contentIdDTO: ContentIdDTO,
    @Body() commentContentDTO: CommentContentDTO,
  ) {
    return await this.commentService.commentContent(
      currentUser.sub,
      contentIdDTO.contentId,
      commentContentDTO,
    );
  }

  @HttpCode(HttpStatus.OK)
  @Get(':contentId/comment')
  async getComments(
    @CurrentUser() currentUser: AuthUser,
    @Param() contentIdDTO: ContentIdDTO,
    @Query() cursorDTO?: CursorDTO,
  ) {
    return await this.commentService.getComments(
      currentUser.sub,
      contentIdDTO.contentId,
      cursorDTO?.cursor,
    );
  }

  @HttpCode(HttpStatus.OK)
  @Delete('comment/:commentId')
  async deleteComment(
    @CurrentUser() currentUser: AuthUser,
    @Param() commentIdDTO: CommentIdDTO,
  ) {
    return await this.commentService.deleteComment(
      currentUser.sub,
      commentIdDTO.commentId,
    );
  }

  @HttpCode(HttpStatus.OK)
  @Patch('comment/:commentId')
  async updateComment(
    @CurrentUser() currentUser: AuthUser,
    @Param() commentIdDTO: CommentIdDTO,
    @Body() updateCommentDTO: UpdateCommentDTO,
  ) {
    return await this.commentService.updateComment(
      currentUser.sub,
      commentIdDTO.commentId,
      updateCommentDTO,
    );
  }

  @HttpCode(HttpStatus.OK)
  @Get('comment/:commentId/replies')
  async getChildComments(
    @CurrentUser() currentUser: AuthUser,
    @Param() commentIdDTO: CommentIdDTO,
    @Query() cursorDTO?: CursorDTO,
  ) {
    return await this.commentService.getChildComments(
      currentUser.sub,
      commentIdDTO.commentId,
      cursorDTO?.cursor,
    );
  }

  @HttpCode(HttpStatus.OK)
  @Get('comment/:commentId')
  async getDetailComment(
    @CurrentUser() currentUser: AuthUser,
    @Param() commentIdDTO: CommentIdDTO,
  ) {
    return await this.commentService.getDetailComment(
      currentUser.sub,
      commentIdDTO.commentId,
    );
  }
}
