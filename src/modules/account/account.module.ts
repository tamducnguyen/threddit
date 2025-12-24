import { Module } from '@nestjs/common';
import { AccountService } from './account.service';
import { AccountController } from './account.controller';
import { AccountRepository } from './account.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SessionEntity } from '../entities/session.entity';
import { UserEntity } from '../entities/user.entity';
import { MailService } from '../mail/mail.service';

@Module({
  imports: [TypeOrmModule.forFeature([SessionEntity, UserEntity])],
  providers: [AccountService, AccountRepository, MailService],
  controllers: [AccountController],
})
export class AccountModule {}
