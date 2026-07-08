import { Module } from '@nestjs/common';
import { AccountService } from './account.service';
import { AccountController } from './account.controller';
import { AccountRepository } from './account.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SessionEntity } from '../../entities/session.entity';
import { UserEntity } from '../../entities/user.entity';
import { MailModule } from '../mail/mail.module';
import { SessionModule } from '../token/session.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SessionEntity, UserEntity]),
    SessionModule,
    MailModule,
  ],
  providers: [AccountService, AccountRepository],
  controllers: [AccountController],
})
export class AccountModule {}
