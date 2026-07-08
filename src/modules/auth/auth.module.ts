import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '../../entities/user.entity';
import { AuthController } from './auth.controller';
import { MailModule } from 'src/modules/mail/mail.module';
import { AuthRepository } from './auth.repository';
import { SessionEntity } from '../../entities/session.entity';
import { SessionModule } from '../token/session.module';
import { GoogleAuthService } from './google.service';

@Module({
  providers: [AuthService, AuthRepository, GoogleAuthService],
  imports: [
    SessionModule,
    MailModule,
    TypeOrmModule.forFeature([UserEntity, SessionEntity]),
  ],
  controllers: [AuthController],
  exports: [],
})
export class AuthModule {}
