import { Module } from '@nestjs/common';
import { JwtAccessStrategy } from './jwt.stragegy';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { SessionEntity } from '../entities/session.entity';

@Module({
  providers: [JwtAccessStrategy],
  imports: [
    TypeOrmModule.forFeature([SessionEntity]),
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('SECRET'),
        signOptions: {
          expiresIn: configService.getOrThrow<string>('EXPIRE_IN'),
        },
      }),
    }),
  ],
  exports: [JwtModule],
})
export class SessionModule {}
