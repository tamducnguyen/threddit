import { InjectRepository } from '@nestjs/typeorm';
import { PostEntity } from '../entities/post.entity';
import {
  DataSource,
  FindOptionsWhere,
  In,
  LessThan,
  Repository,
} from 'typeorm';
import { UserEntity } from '../entities/user.entity';
import { ConfigService } from '@nestjs/config';
import { Cursor } from '../interface/cursor.interface';
import { PostMetrics } from './interface/postmetric.interface';
import { SaveEntity } from '../entities/save.entity';
import { VoteEntity } from '../entities/vote.entity';
import { PostDTO } from './dtos/post.dto';
import { AuthUser } from '../token/authuser.interface';
import { SearchPostDTO } from './dtos/searchpost.dto';

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
    @InjectRepository(VoteEntity)
    private readonly voteRepo: Repository<VoteEntity>,
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
  async getPostMetrics(currentUserId: string, postIds: number[]) {
    const queryMetrics = `
      SELECT 
        p.id AS "id",
        COUNT(DISTINCT c.id) AS "commentNumber",
        COUNT(DISTINCT s.id) AS "saveNumber",
        COUNT(DISTINCT CASE WHEN v.is_upvote = true THEN v.id END) AS "upvoteNumber",
        COUNT(DISTINCT CASE WHEN v.is_upvote = false THEN v.id END) AS "downvoteNumber",
        uv.is_upvote AS "isUpvote",
        us AS "isSaved",
        row_to_json(u) AS "author"
      FROM posts p
      LEFT JOIN comments c ON c."postId" = p.id
      LEFT JOIN saves s ON s."savedPostId" = p.id
      LEFT JOIN votes v ON v."postId" = p.id
      LEFT JOIN votes uv 
        ON uv."postId" = p.id AND uv."voterId" = $2
      LEFT JOIN saves us
        ON us."savedPostId" = p.id AND us."saverId" = $2
      LEFT JOIN users u
        ON u.id = p."authorId" 
      WHERE p.id = ANY($1)
      GROUP BY p.id, uv.is_upvote, us, u.id
      ORDER BY p.id DESC;
    `;
    const postMetricsRaw = await this.datasource.query<PostMetrics[]>(
      queryMetrics,
      [postIds, currentUserId],
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
  async pinPost(postId: number, currentUserId: string) {
    return await this.postRepo.update(
      { id: postId, author: { id: currentUserId } },
      { isPinned: true },
    );
  }
  async unpinPost(postId: number, currentUserId: string) {
    return await this.postRepo.update(
      { id: postId, author: { id: currentUserId } },
      { isPinned: false },
    );
  }
  async createdPost(postEntity: Partial<PostEntity>) {
    return await this.postRepo.save(postEntity);
  }
  async getPostById(postId: number) {
    return await this.postRepo.findOne({
      where: { id: postId },
      relations: { author: true },
    });
  }
  async deletePost(postId: number) {
    return await this.postRepo.delete(postId);
  }
  async savePost(savedPost: Partial<SaveEntity>) {
    return await this.saveRepo.save(savedPost);
  }
  async findSaveByUserAndPost(postId: number, userId: string) {
    return await this.saveRepo.findOne({
      where: { savedPost: { id: postId }, saver: { id: userId } },
    });
  }
  async deleteSavedPost(saveId: number) {
    return await this.saveRepo.delete(saveId);
  }
  async votePost(voteEntity: Partial<VoteEntity>) {
    return await this.voteRepo.save(voteEntity);
  }
  async findVoteByUserAndPost(postId: number, userId: string) {
    return await this.voteRepo.findOne({
      where: { post: { id: postId }, voter: { id: userId } },
    });
  }
  async updateVote(voteId: number, isUpvote: boolean) {
    return await this.voteRepo.update({ id: voteId }, { isUpvote: isUpvote });
  }
  async deleteVote(voteId: number) {
    return await this.voteRepo.delete(voteId);
  }
  async findUsersByUsername(usernames: string[]) {
    return await this.userRepo.find({ where: { username: In(usernames) } });
  }
  async findPostByIdAndAuthorId(postId: number, userId: string) {
    return await this.postRepo.findOne({
      where: { id: postId, author: { id: userId } },
      relations: { mentionedUser: true },
    });
  }
  async updatePost(postEntity: Partial<PostEntity>) {
    return await this.postRepo.save(postEntity);
  }
  async getDetailPost(postId: number, currentUserId: string) {
    const getPostQuery = `
      SELECT 
        p.id AS "id",
        p.content AS "content",
        p.is_pinned AS "isPinned",
        p.created_at AS "createdAt",
        p.updated_at AS "updatedAt",
        COUNT(DISTINCT c.id) AS "commentNumber",
        COUNT(DISTINCT s.id) AS "saveNumber",
        COUNT(DISTINCT CASE WHEN v.is_upvote = true THEN v.id END) AS "upvoteNumber",
        COUNT(DISTINCT CASE WHEN v.is_upvote = false THEN v.id END) AS "downvoteNumber",
        uv.is_upvote AS "isUpvote",
        EXISTS (
          SELECT 1
          FROM saves 
          WHERE saves."savedPostId" = p.id
          AND saves."saverId" = $2
        ) AS "isSaved",
        row_to_json(author) AS "author",
        json_agg(DISTINCT mu) AS "mentionedUser"
      FROM posts p
      LEFT JOIN comments c ON c."postId" = p.id
      LEFT JOIN saves s ON s."savedPostId" = p.id
      LEFT JOIN votes v ON v."postId" = p.id
      LEFT JOIN votes uv 
        ON uv."postId" = p.id AND uv."voterId" = $2
      LEFT JOIN users author
        ON author.id = p."authorId"
      LEFT JOIN mentioned_user muid
        ON muid."postsId" = p.id
      LEFT JOIN users mu
        ON mu.id = muid."usersId"
      WHERE p.id = $1
      GROUP BY p.id, uv.is_upvote, author.id
      LIMIT 1
    `;
    const detailPost = await this.datasource.query<PostDTO[]>(getPostQuery, [
      postId,
      currentUserId,
    ]);
    return detailPost[0];
  }
  async getPostsForFeed(currentUserId: string, seenPostIds?: number[]) {
    let queryGetFeed = `
      SELECT 
        p.id AS "id",
        p.content AS "content",
        p.is_pinned AS "isPinned",
        p.created_at AS "createdAt",
        p.updated_at AS "updatedAt",
        COUNT(DISTINCT c.id) AS "commentNumber",
        COUNT(DISTINCT s.id) AS "saveNumber",
        COUNT(DISTINCT CASE WHEN v.is_upvote = true THEN v.id END) AS "upvoteNumber",
        COUNT(DISTINCT CASE WHEN v.is_upvote = false THEN v.id END) AS "downvoteNumber",
        uv.is_upvote AS "isUpvote",
        EXISTS (
          SELECT 1
          FROM saves 
          WHERE saves."savedPostId" = p.id
          AND saves."saverId" = $1
        ) AS "isSaved",
        row_to_json(author) AS "author",
        json_agg(DISTINCT mu) AS "mentionedUser"
      FROM posts p
      LEFT JOIN comments c ON c."postId" = p.id
      LEFT JOIN saves s ON s."savedPostId" = p.id
      LEFT JOIN votes v ON v."postId" = p.id
      LEFT JOIN votes uv 
        ON uv."postId" = p.id AND uv."voterId" = $1
      LEFT JOIN users author
        ON author.id = p."authorId"
      LEFT JOIN mentioned_user muid
        ON muid."postsId" = p.id
      LEFT JOIN users mu
        ON mu.id = muid."usersId"
      LEFT JOIN (
        SELECT 
          v."postId",
          COUNT(*) AS followee_upvote_number
        FROM votes v
        JOIN follows fl
          ON fl."followeeId" = v."voterId"
          AND fl."followerId" = $1        
        WHERE v.is_upvote = true
        GROUP BY v."postId"
        ) fv
        ON fv."postId" = p.id
      
    `;
    const limit = this.configService.getOrThrow<number>('LIMIT_POST_ITEM');
    const params: any[] = [currentUserId, limit];
    if (seenPostIds) {
      queryGetFeed += `WHERE p.id <> ALL($3::bigint[])`;
      params.push(seenPostIds);
    }
    queryGetFeed += `
      GROUP BY p.id, uv.is_upvote, author.id
      ORDER BY (
          p.id * 0.2
          + COUNT(DISTINCT c.id) * 0.2
          + COUNT(DISTINCT s.id) * 0.1
          + (
              COUNT(DISTINCT CASE WHEN v.is_upvote = true  THEN v.id END)
            - COUNT(DISTINCT CASE WHEN v.is_upvote = false THEN v.id END)
            ) * 0.3
          + (1+COUNT(DISTINCT fv.followee_upvote_number)) * 0.2
          ) DESC
      LIMIT $2
    `;
    const feed = await this.datasource.query<PostDTO[]>(queryGetFeed, params);
    return feed;
  }
  async getFollowingPosts(currentUser: AuthUser, cursor?: Cursor) {
    let followingPostQuery = `
      SELECT 
        p.id AS "id",
        p.content AS "content",
        p.is_pinned AS "isPinned",
        p.created_at AS "createdAt",
        p.updated_at AS "updatedAt",
        COUNT(DISTINCT c.id) AS "commentNumber",
        COUNT(DISTINCT s.id) AS "saveNumber",
        COUNT(DISTINCT CASE WHEN v.is_upvote = true THEN v.id END) AS "upvoteNumber",
        COUNT(DISTINCT CASE WHEN v.is_upvote = false THEN v.id END) AS "downvoteNumber",
        uv.is_upvote AS "isUpvote",
        EXISTS (
          SELECT 1
          FROM saves 
          WHERE saves."savedPostId" = p.id
          AND saves."saverId" = $1
        ) AS "isSaved",
        row_to_json(author) AS "author",
        json_agg(DISTINCT mu) AS "mentionedUser"
      FROM posts p
      LEFT JOIN comments c ON c."postId" = p.id
      LEFT JOIN saves s ON s."savedPostId" = p.id
      LEFT JOIN votes v ON v."postId" = p.id
      LEFT JOIN votes uv 
        ON uv."postId" = p.id AND uv."voterId" = $1
      LEFT JOIN users author
        ON author.id = p."authorId"
      LEFT JOIN mentioned_user muid
        ON muid."postsId" = p.id
      LEFT JOIN users mu
        ON mu.id = muid."usersId"
      LEFT JOIN follows fl 
        ON fl."followerId" = $1
      WHERE p."authorId" = fl."followeeId"
    `;
    //get post item limit number
    const limit = this.configService.getOrThrow<number>('LIMIT_POST_ITEM');
    //init params
    const params = [currentUser.sub, limit];
    if (cursor) {
      params.push(cursor.id);
      followingPostQuery += `AND p.id < $3`;
    }
    followingPostQuery += `
      GROUP BY p.id, uv.is_upvote, author.id
      ORDER BY p.id DESC
      LIMIT $2
    `;
    const followingPosts = await this.datasource.query<PostDTO[]>(
      followingPostQuery,
      params,
    );
    return followingPosts;
  }
  async getPostsByKey(
    currentUser: AuthUser,
    searchPostDTO: SearchPostDTO,
    cursor?: Cursor,
  ) {
    let postsByKeyQuery = `
    SELECT 
        p.id AS "id",
        p.content AS "content",
        p.is_pinned AS "isPinned",
        p.created_at AS "createdAt",
        p.updated_at AS "updatedAt",
        COUNT(DISTINCT c.id) AS "commentNumber",
        COUNT(DISTINCT s.id) AS "saveNumber",
        COUNT(DISTINCT CASE WHEN v.is_upvote = true THEN v.id END) AS "upvoteNumber",
        COUNT(DISTINCT CASE WHEN v.is_upvote = false THEN v.id END) AS "downvoteNumber",
        uv.is_upvote AS "isUpvote",
        EXISTS (
          SELECT 1
          FROM saves 
          WHERE saves."savedPostId" = p.id
          AND saves."saverId" = $1
        ) AS "isSaved",
        row_to_json(author) AS "author",
        json_agg(DISTINCT mu) AS "mentionedUser"
      FROM posts p
      LEFT JOIN comments c ON c."postId" = p.id
      LEFT JOIN saves s ON s."savedPostId" = p.id
      LEFT JOIN votes v ON v."postId" = p.id
      LEFT JOIN votes uv 
        ON uv."postId" = p.id AND uv."voterId" = $1
      LEFT JOIN users author
        ON author.id = p."authorId"
      LEFT JOIN mentioned_user muid
        ON muid."postsId" = p.id
      LEFT JOIN users mu
        ON mu.id = muid."usersId"
      WHERE (p.content ILIKE $3
      OR author.username ILIKE $3)
    `;
    //get post item limit number
    const limit = this.configService.getOrThrow<number>('LIMIT_POST_ITEM');
    //init params
    const params = [currentUser.sub, limit, `%${searchPostDTO.key}%`];
    if (cursor) {
      params.push(cursor.id);
      postsByKeyQuery += `AND p.id < $4`;
    }
    postsByKeyQuery += `
      GROUP BY p.id, uv.is_upvote, author.id
      ORDER BY p.id DESC
      LIMIT $2
    `;
    const postsByKey = await this.datasource.query<PostDTO[]>(
      postsByKeyQuery,
      params,
    );
    return postsByKey;
  }
}
