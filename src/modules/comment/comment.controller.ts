import { message } from '../../common/helper/message.helper';
import { ResponseMessage } from '../../common/decorator/response-message.decorator';
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
import { SessionGuard } from '../../common/guard/session.guard';
import { UserThrottlerGuard } from '../../common/guard/throttler.guard';
import { SkipThrottle } from '@nestjs/throttler';
import { CurrentUser } from '../token/currentuser.decorator';
import { AuthUser } from '../token/authuser.interface';
import { ContentIdDTO } from '../../common/dtos/content-id.dto';
import { CursorDTO } from '../../common/dtos/cursor.dto';
import { CommentContentDTO } from './dtos/comment-content.dto';
import { CommentIdDTO } from './dtos/comment-id.dto';
import { UpdateCommentDTO } from './dtos/update-comment.dto';

@Controller('content')
@UseGuards(SessionGuard, UserThrottlerGuard)
@SkipThrottle({ public: true })
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @ResponseMessage({ success: message.content.comment.success })
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

  @ResponseMessage({
    no_content: message.content.get_comment.no_content,
    success: message.content.get_comment.success,
  })
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

  @ResponseMessage({ success: message.content.delete_comment.success })
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

  @ResponseMessage({ success: message.content.update_comment.success })
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

  @ResponseMessage({
    no_content: message.content.get_comment.no_content,
    success: message.content.get_comment.success,
  })
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

  @ResponseMessage({ success: message.content.get_detail_comment.success })
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
