import { Module } from '@nestjs/common';
import { SavedContentController } from './saved-content.controller';
import { SavedContentService } from './saved-content.service';
import { SavedContentRepository } from './saved-content.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContentEntity } from '../entities/content.entity';
import { UserEntity } from '../entities/user.entity';
import { SaveEntity } from '../entities/save.entity';
import { SessionEntity } from '../entities/session.entity';
import { SessionModule } from '../token/session.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ContentEntity,
      UserEntity,
      SaveEntity,
      SessionEntity,
    ]),
    SessionModule,
  ],
  controllers: [SavedContentController],
  providers: [SavedContentService, SavedContentRepository],
})
export class SavedContentModule {}
