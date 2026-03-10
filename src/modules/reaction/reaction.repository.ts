import { InjectRepository } from '@nestjs/typeorm';
import { ContentEntity } from '../entities/content.entity';
import { Repository } from 'typeorm';
import { UserEntity } from '../entities/user.entity';
import { ReactionEntity } from '../entities/reaction.entity';
import { ReactionTargetType } from '../enum/reactiontargettype.enum';
import { ReactionType } from '../enum/reactiontype.enum';
import { CommentEntity } from '../entities/comment.entity';
import { BlockEntity } from '../entities/block.entity';

export class ReactionRepository {
  constructor(
    @InjectRepository(ContentEntity)
    private readonly contentRepo: Repository<ContentEntity>,
    @InjectRepository(CommentEntity)
    private readonly commentRepo: Repository<CommentEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(BlockEntity)
    private readonly blockRepo: Repository<BlockEntity>,
    @InjectRepository(ReactionEntity)
    private readonly reactionRepo: Repository<ReactionEntity>,
  ) {}

  async findUserById(userId: number) {
    return await this.userRepo.findOne({ where: { id: userId } });
  }

  async findContentById(contentId: number) {
    return await this.contentRepo.findOne({ where: { id: contentId } });
  }

  async findContentWithAuthorById(contentId: number) {
    return await this.contentRepo.findOne({
      where: { id: contentId },
      relations: { author: true },
    });
  }

  async findCommentById(commentId: number) {
    return await this.commentRepo.findOne({ where: { id: commentId } });
  }

  async findCommentWithCommenterById(commentId: number) {
    return await this.commentRepo.findOne({
      where: { id: commentId },
      relations: { commenter: true, content: { author: true } },
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

  async findContentReactionByUser(contentId: number, userId: number) {
    return await this.reactionRepo.findOne({
      where: {
        targetId: contentId,
        reactionTargetType: ReactionTargetType.CONTENT,
        reacter: { id: userId },
      },
    });
  }

  async findCommentReactionByUser(commentId: number, userId: number) {
    return await this.reactionRepo.findOne({
      where: {
        targetId: commentId,
        reactionTargetType: ReactionTargetType.COMMENT,
        reacter: { id: userId },
      },
    });
  }

  async insertContentReaction(
    contentId: number,
    userId: number,
    reactionType: ReactionType,
  ) {
    const insertResult = await this.reactionRepo
      .createQueryBuilder()
      .insert()
      .into(ReactionEntity)
      .values({
        targetId: contentId,
        reactionTargetType: ReactionTargetType.CONTENT,
        reacter: { id: userId } as UserEntity,
        type: reactionType,
      })
      .orIgnore()
      .execute();
    return (insertResult.identifiers?.length ?? 0) > 0;
  }

  async insertCommentReaction(
    commentId: number,
    userId: number,
    reactionType: ReactionType,
  ) {
    const insertResult = await this.reactionRepo
      .createQueryBuilder()
      .insert()
      .into(ReactionEntity)
      .values({
        targetId: commentId,
        reactionTargetType: ReactionTargetType.COMMENT,
        reacter: { id: userId } as UserEntity,
        type: reactionType,
      })
      .orIgnore()
      .execute();
    return (insertResult.identifiers?.length ?? 0) > 0;
  }

  async updateReactionTypeById(reactionId: number, reactionType: ReactionType) {
    const updateResult = await this.reactionRepo.update(
      { id: reactionId },
      { type: reactionType },
    );
    return (updateResult.affected ?? 0) > 0;
  }

  async deleteContentReaction(contentId: number, userId: number) {
    const deleteResult = await this.reactionRepo.delete({
      targetId: contentId,
      reactionTargetType: ReactionTargetType.CONTENT,
      reacter: { id: userId } as UserEntity,
    });
    return (deleteResult.affected ?? 0) > 0;
  }

  async deleteCommentReaction(commentId: number, userId: number) {
    const deleteResult = await this.reactionRepo.delete({
      targetId: commentId,
      reactionTargetType: ReactionTargetType.COMMENT,
      reacter: { id: userId } as UserEntity,
    });
    return (deleteResult.affected ?? 0) > 0;
  }
}
