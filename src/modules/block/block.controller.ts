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
  UseGuards,
} from '@nestjs/common';
import { BlockService } from './block.service';
import { CurrentUser } from '../token/currentuser.decorator';
import { AuthUser } from '../token/authuser.interface';
import { UsernameDTO } from '../../common/dtos/username.dto';
import { SearchUserWithCursorDTO } from '../../common/dtos/search-user-with-cursor.dto';
import { SessionGuard } from '../../common/guard/session.guard';
import { UserThrottlerGuard } from '../../common/guard/throttler.guard';
import { SkipThrottle } from '@nestjs/throttler';

@Controller('block')
@UseGuards(SessionGuard, UserThrottlerGuard)
@SkipThrottle({ public: true })
export class BlockController {
  constructor(private readonly blockService: BlockService) {}
  @ResponseMessage({ success: message.block.post_block.success })
  @HttpCode(HttpStatus.OK)
  @Post(':username')
  async block(
    @CurrentUser() currentUser: AuthUser,
    @Param() usernameDTO: UsernameDTO,
  ) {
    // call service to block the user
    return await this.blockService.block(currentUser, usernameDTO.username);
  }

  @ResponseMessage({ success: message.block.get_blocked_list.success })
  @HttpCode(HttpStatus.OK)
  @Get()
  async getBlockedList(
    @CurrentUser() currentUser: AuthUser,
    @Query() query?: SearchUserWithCursorDTO,
  ) {
    return await this.blockService.getBlockedList(
      currentUser,
      query?.key?.trim(),
      query?.cursor,
    );
  }

  @ResponseMessage({ success: message.block.get_block_status.success })
  @HttpCode(HttpStatus.OK)
  @Get(':username/status')
  async getBlockStatus(
    @CurrentUser() currentUser: AuthUser,
    @Param() usernameDTO: UsernameDTO,
  ) {
    return await this.blockService.getBlockStatus(
      currentUser,
      usernameDTO.username,
    );
  }

  @ResponseMessage({ success: message.block.delete_block.success })
  @HttpCode(HttpStatus.OK)
  @Delete(':username')
  async unblock(
    @CurrentUser() currentUser: AuthUser,
    @Param() usernameDTO: UsernameDTO,
  ) {
    // call service to unblock the user
    return await this.blockService.unblock(currentUser, usernameDTO.username);
  }

  @ResponseMessage({ success: message.block.get_blocked_user_count.success })
  @HttpCode(HttpStatus.OK)
  @Get('count')
  async getBlockedUserCount(@CurrentUser() currentUser: AuthUser) {
    return await this.blockService.getBlockedUserCount(currentUser.sub);
  }
}
