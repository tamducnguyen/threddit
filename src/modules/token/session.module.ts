import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { SessionEntity } from '../../entities/session.entity';
import { SessionService } from './session.service';

@Module({
  providers: [SessionService],
  imports: [
    TypeOrmModule.forFeature([SessionEntity]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('SECRET'),
        signOptions: {
          expiresIn: configService.getOrThrow<number>('EXPIRE_IN'),
        },
      }),
    }),
  ],
  exports: [JwtModule, SessionService],
})
export class SessionModule {}
