import { Module } from '@nestjs/common';
import { HttpsService } from './http.service';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModuleConfig } from '../config/httpmodule.config';

@Module({
  imports: [
    HttpModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: HttpModuleConfig,
    }),
  ],
  providers: [HttpsService],
  exports: [HttpsService],
})
export class HttpsModule {}
