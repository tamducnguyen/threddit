import { InjectRepository } from '@nestjs/typeorm';
import { PostEntity } from '../entities/post.entity';
import { DataSource, FindOptionsWhere, LessThan, Repository } from 'typeorm';
import { UserEntity } from '../entities/user.entity';
import { ConfigService } from '@nestjs/config';
import { Cursor } from '../interface/cursor.interface';
import { PostMetrics } from './interface/postmetric.interface';
import { SaveEntity } from '../entities/save.entity';

export class PostRepository {
  constructor(
    @InjectRepository(PostEntity)
    private readonly postRepo: Repository<PostEntity>,
    private readonly configService: ConfigService,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    private readonly datasource: DataSource,
    @InjectRepository(SaveEntity)
    private readonly saveRepo: Repository<SaveEntity>,
  ) {}
  async getSelfPost(user: UserEntity, cursor?: Cursor) {
    let condition: FindOptionsWhere<PostEntity> = { author: user };
    if (cursor?.id) {
      condition = { ...condition, id: LessThan(cursor.id) };
    }
    return await this.postRepo.find({
      where: condition,
      relations: { mentionedUser: true },
      take: this.configService.getOrThrow<number>('LIMIT_POST_ITEM'),
      order: { id: 'DESC' },
    });
  }
  async getSavePost(user: UserEntity, cursor?: Cursor) {
    let condition: FindOptionsWhere<SaveEntity> = { saver: user };
    if (cursor?.id) {
      condition = { ...condition, id: LessThan(cursor.id) };
    }
    return await this.saveRepo.find({
      where: condition,
      relations: { savedPost: true },
      take: this.configService.getOrThrow<number>('LIMIT_POST_ITEM'),
      order: { id: 'DESC' },
    });
  }
  async getPostMetrics(postIds: number[]) {
    const queryMetrics = `
      SELECT 
        p.id AS "id",
        COUNT(DISTINCT c.id) AS "commentNumber",
        COUNT(DISTINCT s.id) AS "saveNumber",
        COUNT(DISTINCT CASE WHEN v.is_upvote = true THEN v.id END) AS "upvoteNumber",
        COUNT(DISTINCT CASE WHEN v.is_upvote = false THEN v.id END) AS "downvoteNumber"
      FROM posts p
      LEFT JOIN comments c ON c."postId" = p.id
      LEFT JOIN saves s ON s."savedPostId" = p.id
      LEFT JOIN votes v ON v."postId" = p.id
      WHERE p.id = ANY($1)        
      GROUP BY p.id
    `;
    const postMetricsRaw = await this.datasource.query<PostMetrics[]>(
      queryMetrics,
      [postIds],
    );
    const postMetrics = {};
    for (const postMetric of postMetricsRaw) {
      postMetrics[Number(postMetric.id)] = { ...postMetric };
    }
    return postMetrics;
  }
  async findUserbyUsername(username: string) {
    return await this.userRepo.findOne({ where: { username: username } });
  }
}
