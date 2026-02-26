import { InjectRepository } from '@nestjs/typeorm';
import { ContentEntity } from '../entities/content.entity';
import { Repository } from 'typeorm';
import { UserEntity } from '../entities/user.entity';
import { ShareEntity } from '../entities/share.entity';
import { ContentType } from '../enum/contenttype.enum';
import { BlockEntity } from '../entities/block.entity';

export class ShareRepository {
  constructor(
    @InjectRepository(ContentEntity)
    private readonly contentRepo: Repository<ContentEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(ShareEntity)
    private readonly shareRepo: Repository<ShareEntity>,
    @InjectRepository(BlockEntity)
    private readonly blockRepo: Repository<BlockEntity>,
  ) {}

  async findUserById(userId: number) {
    return await this.userRepo.findOne({ where: { id: userId } });
  }

  async findPostWithAuthorById(contentId: number) {
    return await this.contentRepo.findOne({
      where: { id: contentId, type: ContentType.POST },
      relations: { author: true },
    });
  }

  async checkBlocked(blockedId: number, blockerId: number) {
    return await this.blockRepo.exists({
      where: {
        blockedUser: { id: blockedId },
        blocker: { id: blockerId },
      },
    });
  }

  async checkSharedContent(contentId: number, userId: number) {
    return await this.shareRepo.exists({
      where: {
        sharedContent: { id: contentId },
        sharer: { id: userId },
      },
    });
  }

  async insertShareContent(
    contentId: number,
    userId: number,
    shareMessage: string | null,
  ) {
    const insertResult = await this.shareRepo
      .createQueryBuilder()
      .insert()
      .into(ShareEntity)
      .values({
        sharedContent: { id: contentId } as ContentEntity,
        sharer: { id: userId } as UserEntity,
        message: shareMessage,
      })
      .orIgnore()
      .execute();
    return (insertResult.identifiers?.length ?? 0) > 0;
  }

  async deleteShareContent(contentId: number, userId: number) {
    const deleteResult = await this.shareRepo.delete({
      sharedContent: { id: contentId } as ContentEntity,
      sharer: { id: userId } as UserEntity,
    });
    return (deleteResult.affected ?? 0) > 0;
  }

  async updateShareContentMessage(
    contentId: number,
    userId: number,
    shareMessage: string | null,
  ) {
    const updateResult = await this.shareRepo.update(
      {
        sharedContent: { id: contentId } as ContentEntity,
        sharer: { id: userId } as UserEntity,
      },
      { message: shareMessage },
    );
    return (updateResult.affected ?? 0) > 0;
  }
}
