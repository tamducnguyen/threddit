import { Module } from '@nestjs/common';
import { ShareController } from './share.controller';
import { ShareService } from './share.service';
import { ShareRepository } from './share.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContentEntity } from '../entities/content.entity';
import { UserEntity } from '../entities/user.entity';
import { ShareEntity } from '../entities/share.entity';
import { SessionEntity } from '../entities/session.entity';
import { SessionModule } from '../token/session.module';
import { BlockEntity } from '../entities/block.entity';
import { HttpsModule } from '../http/http.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ContentEntity,
      UserEntity,
      ShareEntity,
      BlockEntity,
      SessionEntity,
    ]),
    SessionModule,
    HttpsModule,
  ],
  controllers: [ShareController],
  providers: [ShareService, ShareRepository],
})
export class ShareModule {}
