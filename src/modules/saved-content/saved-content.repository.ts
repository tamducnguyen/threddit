import { InjectRepository } from '@nestjs/typeorm';
import { ContentEntity } from '../entities/content.entity';
import { Repository } from 'typeorm';
import { SaveEntity } from '../entities/save.entity';
import { UserEntity } from '../entities/user.entity';
import { ContentType } from '../enum/contenttype.enum';

export class SavedContentRepository {
  constructor(
    @InjectRepository(ContentEntity)
    private readonly contentRepo: Repository<ContentEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(SaveEntity)
    private readonly saveRepo: Repository<SaveEntity>,
  ) {}

  async findUserById(userId: number) {
    return await this.userRepo.findOne({ where: { id: userId } });
  }

  async findPostById(contentId: number) {
    return await this.contentRepo.findOne({
      where: { id: contentId, type: ContentType.POST },
    });
  }

  async checkSavedContent(contentId: number, userId: number) {
    return await this.saveRepo.exists({
      where: {
        savedContent: { id: contentId },
        saver: { id: userId },
      },
    });
  }

  async insertSaveContent(contentId: number, userId: number) {
    const insertResult = await this.saveRepo
      .createQueryBuilder()
      .insert()
      .into(SaveEntity)
      .values({
        savedContent: { id: contentId } as ContentEntity,
        saver: { id: userId } as UserEntity,
      })
      .orIgnore()
      .execute();
    return (insertResult.identifiers?.length ?? 0) > 0;
  }

  async deleteSaveContent(contentId: number, userId: number) {
    const deleteResult = await this.saveRepo.delete({
      savedContent: { id: contentId } as ContentEntity,
      saver: { id: userId } as UserEntity,
    });
    return (deleteResult.affected ?? 0) > 0;
  }
}
