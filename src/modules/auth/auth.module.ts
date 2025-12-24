import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '../entities/user.entity';
import { AuthController } from './auth.controller';
import { MailService } from 'src/modules/mail/mail.service';
import { AuthRepository } from './auth.repository';
import { SessionEntity } from '../entities/session.entity';
import { SessionModule } from '../token/session.module';
import { GoogleAuthService } from './google.service';

@Module({
  providers: [AuthService, MailService, AuthRepository, GoogleAuthService],
  imports: [
    SessionModule,
    TypeOrmModule.forFeature([UserEntity, SessionEntity]),
  ],
  controllers: [AuthController],
  exports: [],
})
export class AuthModule {}
