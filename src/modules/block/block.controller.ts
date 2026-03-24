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
import { UsernameDTO } from './dto/username.dto';
import { CursorDTO } from './dto/cursor.dto';
import { SearchUserOptionalDTO } from './dto/searchuser.dto';
import { AuthGuard } from '@nestjs/passport';
import { TokenGuard } from '../common/guard/token.guard';
import { UserThrottlerGuard } from '../common/guard/throttler.guard';
import { SkipThrottle } from '@nestjs/throttler';

@Controller('block')
@UseGuards(AuthGuard('jwt'), TokenGuard, UserThrottlerGuard)
@SkipThrottle({ public: true })
export class BlockController {
  constructor(private readonly blockService: BlockService) {}
  @HttpCode(HttpStatus.OK)
  @Post(':username')
  async block(
    @CurrentUser() currentUser: AuthUser,
    @Param() usernameDTO: UsernameDTO,
  ) {
    // call service to block the user
    return await this.blockService.block(currentUser, usernameDTO.username);
  }

  @HttpCode(HttpStatus.OK)
  @Get()
  async getBlockedList(
    @CurrentUser() currentUser: AuthUser,
    @Query() searchUserDTO?: SearchUserOptionalDTO,
    @Query() cursorDTO?: CursorDTO,
  ) {
    return await this.blockService.getBlockedList(
      currentUser,
      searchUserDTO?.key?.trim(),
      cursorDTO?.cursor,
    );
  }

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

  @HttpCode(HttpStatus.OK)
  @Delete(':username')
  async unblock(
    @CurrentUser() currentUser: AuthUser,
    @Param() usernameDTO: UsernameDTO,
  ) {
    // call service to unblock the user
    return await this.blockService.unblock(currentUser, usernameDTO.username);
  }

  @HttpCode(HttpStatus.OK)
  @Get('count')
  async getBlockedUserCount(@CurrentUser() currentUser: AuthUser) {
    return await this.blockService.getBlockedUserCount(currentUser.sub);
  }
}
