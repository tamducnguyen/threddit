import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ReactionService } from './reaction.service';
import { AuthGuard } from '@nestjs/passport';
import { TokenGuard } from '../common/guard/token.guard';
import { UserThrottlerGuard } from '../common/guard/throttler.guard';
import { SkipThrottle } from '@nestjs/throttler';
import { CurrentUser } from '../token/currentuser.decorator';
import { AuthUser } from '../token/authuser.interface';
import { ContentIdDTO } from './dtos/content-id.dto';
import { ReactionTypeDTO } from './dtos/reaction-type.dto';

@Controller('content')
@UseGuards(AuthGuard('jwt'), TokenGuard, UserThrottlerGuard)
@SkipThrottle({ public: true })
export class ReactionController {
  constructor(private readonly reactionService: ReactionService) {}

  @HttpCode(HttpStatus.OK)
  @Post(':contentId/reaction')
  async createContentReaction(
    @CurrentUser() currentUser: AuthUser,
    @Param() contentIdDTO: ContentIdDTO,
    @Body() reactionTypeDTO: ReactionTypeDTO,
  ) {
    return await this.reactionService.createContentReaction(
      currentUser.sub,
      contentIdDTO.contentId,
      reactionTypeDTO,
    );
  }

  @HttpCode(HttpStatus.OK)
  @Patch(':contentId/reaction')
  async updateContentReaction(
    @CurrentUser() currentUser: AuthUser,
    @Param() contentIdDTO: ContentIdDTO,
    @Body() reactionTypeDTO: ReactionTypeDTO,
  ) {
    return await this.reactionService.updateContentReaction(
      currentUser.sub,
      contentIdDTO.contentId,
      reactionTypeDTO,
    );
  }

  @HttpCode(HttpStatus.OK)
  @Delete(':contentId/reaction')
  async deleteContentReaction(
    @CurrentUser() currentUser: AuthUser,
    @Param() contentIdDTO: ContentIdDTO,
  ) {
    return await this.reactionService.deleteContentReaction(
      currentUser.sub,
      contentIdDTO.contentId,
    );
  }
}
