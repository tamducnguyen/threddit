import {
  BadRequestException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PostRepository } from './post.repository';
import { Cursor } from '../interface/cursor.interface';
import { message } from '../common/helper/message.helper';
import { JwtService } from '@nestjs/jwt';
import { sendResponse } from '../common/helper/response.helper';
import { PostMetrics } from './interface/postmetric.interface';
import { CreatePostDTO } from './dtos/createpost.dto';
import type { Cache } from 'cache-manager';
import { AuthUser } from '../token/authuser.interface';
import { PostEntity } from '../entities/post.entity';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  JobNotificationQueue,
  NameNotificationQueue,
} from '../common/helper/notification.helper';
import { PostIdDTO } from './dtos/postid.dto';
import { SaveEntity } from '../entities/save.entity';
import { VotePostDTO } from './dtos/votepost.dto';
import { VoteEntity } from '../entities/vote.entity';
import { HttpsService } from '../http/http.service';
import { UpdatePostDTO } from './dtos/updatepost.dto';
import { UserEntity } from '../entities/user.entity';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { prefixCache, ttlCache } from '../config/cache.config';
import { ConfigService } from '@nestjs/config';
import { SearchPostDTO } from './dtos/searchpost.dto';
import { Observable, Subject } from 'rxjs';
import { CommentEntity } from '../entities/comment.entity';
import { CreateCommentDTO } from './dtos/createcomment.dto';
import { DetailCommentDTO } from './dtos/detailcomment.dto';
import { UpdateCommentDTO } from './dtos/updatecomment.dto';

@Injectable()
export class PostService {
  constructor(
    private readonly postRepo: PostRepository,
    private readonly jwtService: JwtService,
    private readonly httpsService: HttpsService,
    @InjectQueue(NameNotificationQueue)
    private readonly notificationQueue: Queue,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly configService: ConfigService,
  ) {}
  private commentBus = new Subject<Partial<CommentEntity>>();
  async getCreatedPost(
    currentUser: AuthUser,
    username: string,
    cursor?: string,
  ) {
    //check if user exist
    const userFound = await this.postRepo.findUserbyUsername(username);
    if (!userFound) {
      throw new NotFoundException(message.post.get_created_post.user_not_found);
    }
    //check if has cursor
    let cursorDecoded: Cursor | undefined;
    if (cursor) {
      try {
        cursorDecoded = await this.jwtService.verifyAsync<Cursor>(cursor);
      } catch {
        throw new BadRequestException(
          message.post.get_created_post.cursor_invalid,
        );
      }
    } else {
      cursorDecoded = undefined;
    }
    //get create post list
    const rawPosts = await this.postRepo.getSelfPost(userFound, cursorDecoded);
    //check if no content
    const finalPosts = rawPosts[rawPosts.length - 1];
    if (!finalPosts) {
      return sendResponse(
        HttpStatus.NO_CONTENT,
        message.post.get_created_post.no_content,
      );
    }
    //sign cursor
    const cursorPayload = { id: finalPosts.id };
    const cursorToken = await this.jwtService.signAsync(cursorPayload);
    //get neccessary data
    const postMetrics = await this.postRepo.getPostMetrics(
      currentUser.sub,
      rawPosts.map((post) => post.id),
    );
    const posts = rawPosts.map((post) => {
      const postMetric = postMetrics[Number(post.id)] as PostMetrics;
      return {
        id: post.id,
        author: postMetric.author,
        content: post.content,
        isPinned: post.isPinned,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
        mentionedUser: post.mentionedUser,
        isUpvote: postMetric.isUpvote,
        isSave: Boolean(postMetric.isSaved),
        commentNumber: Number(postMetric.commentNumber),
        saveNumber: Number(postMetric.saveNumber),
        upvoteNumber: Number(postMetric.upvoteNumber),
        downvoteNumber: Number(postMetric.downvoteNumber),
      };
    });
    //send response
    const data = {
      posts: posts,
      cursor: cursorToken,
    };
    return sendResponse(
      HttpStatus.OK,
      message.post.get_created_post.success,
      data,
    );
  }
  async getSavedPost(currentUser: AuthUser, username: string, cursor?: string) {
    //check if user exist
    const userFound = await this.postRepo.findUserbyUsername(username);
    if (!userFound) {
      throw new NotFoundException(message.post.get_saved_post.user_not_found);
    }
    //check if has cursor
    let cursorDecoded: Cursor | undefined;
    if (cursor) {
      try {
        cursorDecoded = await this.jwtService.verifyAsync<Cursor>(cursor);
      } catch {
        throw new BadRequestException(
          message.post.get_saved_post.cursor_invalid,
        );
      }
    } else {
      cursorDecoded = undefined;
    }
    //get create post list
    const saves = await this.postRepo.getSavePost(userFound, cursorDecoded);
    //check if no content
    const finalSave = saves[saves.length - 1];
    if (!finalSave) {
      return sendResponse(
        HttpStatus.NO_CONTENT,
        message.post.get_saved_post.no_content,
      );
    }
    //sign cursor
    const cursorPayload = { id: finalSave.id };
    const cursorToken = await this.jwtService.signAsync(cursorPayload);
    //get neccessary data
    const rawPosts = saves.map((save) => save.savedPost);
    const postMetrics = await this.postRepo.getPostMetrics(
      currentUser.sub,
      rawPosts.map((post) => post.id),
    );
    const posts = rawPosts.map((post) => {
      const postMetric = postMetrics[Number(post.id)] as PostMetrics;
      return {
        id: post.id,
        author: postMetric.author,
        content: post.content,
        isPinned: post.isPinned,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
        mentionedUser: post.mentionedUser,
        isUpvote: postMetric.isUpvote,
        isSave: Boolean(postMetric.isSaved),
        commentNumber: Number(postMetric.commentNumber),
        saveNumber: Number(postMetric.saveNumber),
        upvoteNumber: Number(postMetric.upvoteNumber),
        downvoteNumber: Number(postMetric.downvoteNumber),
      };
    });
    //send response
    const data = {
      posts: posts,
      cursor: cursorToken,
    };
    return sendResponse(
      HttpStatus.OK,
      message.post.get_saved_post.success,
      data,
    );
  }
  /**
   * pin self post
   * @param currentUserId
   * @param postId
   * @returns
   */
  async pinSelfPost(currentUserId: string, postId: number) {
    //switch isPinned attribute to true
    const postUpdateResult = await this.postRepo.pinPost(postId, currentUserId);
    //check if any row is affected, if not throw NotFoundException
    if (postUpdateResult.affected == 0) {
      throw new NotFoundException(message.post.pin_post.not_found);
    }
    //send ok response
    return sendResponse(HttpStatus.OK, message.post.pin_post.success);
  }
  /**
   * unpin self post
   * @param currentUserId
   * @param postId
   */
  async unpinSelfPost(currentUserId: string, postId: number) {
    //switch isPinned attribute to false
    const postUpdateResult = await this.postRepo.unpinPost(
      postId,
      currentUserId,
    );
    //check if any row is affected, if not throw NotFoundException
    if (postUpdateResult.affected == 0) {
      throw new NotFoundException(message.post.unpin_post.not_found);
    }
    //send response ok
    return sendResponse(HttpStatus.OK, message.post.unpin_post.success);
  }
  /**
   * create post
   * @param currentUser
   * @param postDTO
   */
  async createPost(currentUser: AuthUser, postDTO: CreatePostDTO) {
    //check if user exist, if not throw a NotFoundException
    const { username } = currentUser;
    const currentUserFound = await this.postRepo.findUserbyUsername(username);
    if (!currentUserFound) {
      throw new NotFoundException(message.post.create_post.user_not_found);
    }
    //check if content is toxic
    const { content, mentionedUser } = postDTO;
    await this.httpsService.checkToxic(content);
    //insert and notify
    let postCreated: PostEntity;
    // if has mentioned users
    if (mentionedUser?.length) {
      const mentionedUserFilter = mentionedUser.filter(
        (username) => username !== currentUser.username,
      );
      //get mentioned users
      const mentionedUserFound =
        await this.postRepo.findUsersByUsername(mentionedUserFilter);
      //insert post
      const postEntity: Partial<PostEntity> = {
        content: content,
        author: currentUserFound,
        mentionedUser: mentionedUserFound,
      };
      postCreated = await this.postRepo.createdPost(postEntity);
      //notify to mentioned users
      await this.notificationQueue.add(
        JobNotificationQueue.MENTION,
        {
          currentUser: currentUserFound,
          mentionedUser: mentionedUserFound,
          post: postCreated,
        },
        { priority: 2 },
      );
    } else {
      //if has no mentioned user
      const postEntity: Partial<PostEntity> = {
        content: content,
        author: currentUserFound,
      };
      postCreated = await this.postRepo.createdPost(postEntity);
    }
    // notify to all follower
    await this.notificationQueue.add(
      JobNotificationQueue.CREATE_POST,
      {
        currentUser: currentUserFound,
        postCreated: postCreated,
      },
      { priority: 3 },
    );
    //get detail post
    const postCreatedFound = await this.postRepo.getDetailPost(
      postCreated.id,
      currentUser.sub,
    );
    //send ok response
    return sendResponse(
      HttpStatus.OK,
      message.post.create_post.success,
      postCreatedFound,
    );
  }
  /**
   * delete post
   * @param currentUser
   * @param postIdDTO
   * @returns
   */
  async deletePost(currentUser: AuthUser, postIdDTO: PostIdDTO) {
    //check if user exist, if not throw a NotFoundException
    const { username, sub } = currentUser;
    const currentUserFound = await this.postRepo.findUserbyUsername(username);
    if (!currentUserFound) {
      throw new NotFoundException(message.post.delete_post.user_not_found);
    }
    //check post if user is post's author
    const { postId } = postIdDTO;
    const postFound = await this.postRepo.findPostByIdAndAuthorId(postId, sub);
    if (!postFound) {
      throw new NotFoundException(message.post.delete_post.not_found);
    }
    //delete post
    await this.postRepo.deletePost(postFound.id);
    return sendResponse(HttpStatus.OK, message.post.delete_post.success);
  }
  /**
   * save post
   * @param currentUser
   * @param postIdDTO
   * @returns
   */
  async savePost(currentUser: AuthUser, postIdDTO: PostIdDTO) {
    //check if user exist, if not throw a NotFoundException
    const { username } = currentUser;
    const currentUserFound = await this.postRepo.findUserbyUsername(username);
    if (!currentUserFound) {
      throw new NotFoundException(message.post.save_post.user_not_found);
    }
    //check post if exist
    const { postId } = postIdDTO;
    const postFound = await this.postRepo.getPostById(postId);
    if (!postFound) {
      throw new NotFoundException(message.post.save_post.not_found);
    }
    //check if already save
    const saveFound = await this.postRepo.findSaveByUserAndPost(
      postFound.id,
      currentUserFound.id,
    );
    if (saveFound) {
      throw new BadRequestException(message.post.save_post.already);
    }
    //insert save post
    const saveEntity: Partial<SaveEntity> = {
      saver: currentUserFound,
      savedPost: postFound,
    };
    await this.postRepo.savePost(saveEntity);
    return sendResponse(HttpStatus.OK, message.post.save_post.success);
  }
  /**
   * unsave post
   * @param currentUser
   * @param postIdDTO
   * @returns
   */
  async unsavePost(currentUser: AuthUser, postIdDTO: PostIdDTO) {
    //check if user exist, if not throw a NotFoundException
    const { username } = currentUser;
    const currentUserFound = await this.postRepo.findUserbyUsername(username);
    if (!currentUserFound) {
      throw new NotFoundException(message.post.unsave_post.user_not_found);
    }
    //check if exist
    const { postId } = postIdDTO;
    const postFound = await this.postRepo.getPostById(postId);
    if (!postFound) {
      throw new NotFoundException(message.post.unsave_post.not_found);
    }
    //check if already save
    const saveFound = await this.postRepo.findSaveByUserAndPost(
      postFound.id,
      currentUserFound.id,
    );
    if (!saveFound) {
      throw new BadRequestException(message.post.unsave_post.not_save);
    }
    //delete save post entity
    await this.postRepo.deleteSavedPost(saveFound.id);
    return sendResponse(HttpStatus.OK, message.post.unsave_post.success);
  }
  /**
   * vote post
   * @param currentUser
   * @param votePostDTO
   * @returns
   */
  async votePost(currentUser: AuthUser, votePostDTO: VotePostDTO) {
    //check if user exist
    const currentUserFound = await this.postRepo.findUserbyUsername(
      currentUser.username,
    );
    if (!currentUserFound) {
      throw new NotFoundException(message.post.vote_post.user_not_found);
    }
    //check if post exist
    const { postId, isUpvote } = votePostDTO;
    const postFound = await this.postRepo.getPostById(postId);
    if (!postFound) {
      throw new NotFoundException(message.post.vote_post.not_found);
    }
    //check exist vote entity
    const voteFound = await this.postRepo.findVoteByUserAndPost(
      postFound.id,
      currentUserFound.id,
    );
    //if vote not exist, insert
    if (!voteFound) {
      const voteEntity: Partial<VoteEntity> = {
        post: postFound,
        voter: currentUserFound,
        isUpvote: isUpvote,
      };
      await this.postRepo.votePost(voteEntity);
      return sendResponse(HttpStatus.OK, message.post.vote_post.success);
    }
    //if vote exist, update
    if (voteFound.isUpvote == isUpvote) {
      throw new BadRequestException(message.post.vote_post.already);
    }
    await this.postRepo.updateVote(voteFound.id, isUpvote);
    return sendResponse(HttpStatus.OK, message.post.vote_post.success);
  }
  /**
   * unvote post
   * @param currentUser
   * @param postIdDTO
   * @returns
   */
  async unvotePost(currentUser: AuthUser, postIdDTO: PostIdDTO) {
    //check if user exist
    const currentUserFound = await this.postRepo.findUserbyUsername(
      currentUser.username,
    );
    if (!currentUserFound) {
      throw new NotFoundException(message.post.unvote_post.user_not_found);
    }
    //check if post exist
    const { postId } = postIdDTO;
    const postFound = await this.postRepo.getPostById(postId);
    if (!postFound) {
      throw new NotFoundException(message.post.unvote_post.not_found);
    }
    //check exist vote entity
    const voteFound = await this.postRepo.findVoteByUserAndPost(
      postFound.id,
      currentUserFound.id,
    );
    if (!voteFound) {
      throw new BadRequestException(message.post.unvote_post.not_vote);
    }
    //delete vote
    await this.postRepo.deleteVote(voteFound.id);
    return sendResponse(HttpStatus.OK, message.post.unvote_post.success);
  }
  /**
   * update post
   */
  async updatePost(
    currentUser: AuthUser,
    postIdDTO: PostIdDTO,
    updatePostDTO: UpdatePostDTO,
  ) {
    //destruct data
    const { sub } = currentUser;
    const { postId } = postIdDTO;
    //check if post exist with it's author
    const postAuthFound = await this.postRepo.findPostByIdAndAuthorId(
      postId,
      sub,
    );
    if (!postAuthFound) {
      throw new NotFoundException(message.post.update_post.not_found);
    }
    //check toxic
    const { content, mentionedUser } = updatePostDTO;
    await this.httpsService.checkToxic(content);
    //check if different mentioned users
    if (mentionedUser) {
      //find mention users in db
      const mentionedUserFound =
        await this.postRepo.findUsersByUsername(mentionedUser);
      const alreadyMentionedUsers = postAuthFound.mentionedUser;
      let newMentionUsers: UserEntity[];
      if (alreadyMentionedUsers.length > 0) {
        const alreadyMentionedUserIds = new Set(
          alreadyMentionedUsers.map((user) => user.id),
        );
        newMentionUsers = mentionedUserFound.filter(
          (user) => !alreadyMentionedUserIds.has(user.id),
        );
      } else {
        newMentionUsers = mentionedUserFound;
      }
      //update
      const postEntity = {
        id: postAuthFound.id,
        content: content,
        mentionedUser: mentionedUserFound,
      };
      await this.postRepo.updatePost(postEntity);
      const postUpdated = await this.postRepo.getDetailPost(
        postEntity.id,
        currentUser.sub,
      );
      //notify to new mentioned user
      if (newMentionUsers.length > 0) {
        await this.notificationQueue.add(JobNotificationQueue.MENTION, {
          currentUser: currentUser,
          mentionedUser: newMentionUsers,
          post: postUpdated,
        });
      }
      //send response
      return sendResponse(
        HttpStatus.OK,
        message.post.update_post.success,
        postUpdated,
      );
    } else {
      const postEntity = { id: postAuthFound.id, content: content };
      await this.postRepo.updatePost(postEntity);
      const postUpdated = await this.postRepo.getDetailPost(
        postEntity.id,
        currentUser.sub,
      );
      //send response
      return sendResponse(
        HttpStatus.OK,
        message.post.update_post.success,
        postUpdated,
      );
    }
  }
  /**
   * get detail post
   */
  async getPost(currentUser: AuthUser, postIdDTO: PostIdDTO) {
    const { postId } = postIdDTO;
    const detailPost = await this.postRepo.getDetailPost(
      postId,
      currentUser.sub,
    );
    if (!detailPost) {
      throw new NotFoundException(message.post.get_post.not_found);
    }
    return sendResponse(
      HttpStatus.OK,
      message.post.get_post.success,
      detailPost,
    );
  }
  /**
   * get feed
   */
  async getFeed(currentUser: AuthUser) {
    // get seen post id array
    const keyFeedAlready = prefixCache.feedalready + currentUser.sub;
    let feedAlreadyArray =
      await this.cacheManager.get<number[]>(keyFeedAlready);
    //get feed
    const feed = await this.postRepo.getPostsForFeed(
      currentUser.sub,
      feedAlreadyArray,
    );
    //if has no post in feed
    if (feed.length == 0) {
      return sendResponse(
        HttpStatus.NO_CONTENT,
        message.post.get_feed.no_content,
      );
    }
    //get post id array
    let postIds = feed.map((post) => post.id);
    //get max feed item cache number
    const MAX_FEED_ITEM_CACHE = this.configService.getOrThrow<number>(
      'MAX_FEED_ITEM_CACHE',
    );
    //if feed already exist
    if (feedAlreadyArray) {
      feedAlreadyArray.unshift(...postIds);
      //check if feed already > 1000, clear over post
      if (feedAlreadyArray.length > MAX_FEED_ITEM_CACHE) {
        feedAlreadyArray = feedAlreadyArray.slice(0, MAX_FEED_ITEM_CACHE);
      }
      await this.cacheManager.set(
        keyFeedAlready,
        feedAlreadyArray,
        ttlCache.feedalready,
      );
    } else {
      if (postIds.length > MAX_FEED_ITEM_CACHE)
        postIds = postIds.slice(0, MAX_FEED_ITEM_CACHE);
      await this.cacheManager.set(
        keyFeedAlready,
        postIds,
        ttlCache.feedalready,
      );
    }
    return sendResponse(HttpStatus.OK, message.post.get_feed.success, feed);
  }
  /**
   * get post created by current user's followee users
   * @param currentUser
   * @param cursor
   * @returns
   */
  async getFollowingPosts(currentUser: AuthUser, cursor?: string) {
    //check if has cursor
    let cursorDecoded: Cursor | undefined;
    if (cursor) {
      try {
        cursorDecoded = await this.jwtService.verifyAsync<Cursor>(cursor);
      } catch {
        throw new BadRequestException(
          message.post.get_following_post.cursor_invalid,
        );
      }
    } else {
      cursorDecoded = undefined;
    }
    //get post created by current user's followee users
    const followingPosts = await this.postRepo.getFollowingPosts(
      currentUser,
      cursorDecoded,
    );
    //check if has any post
    if (followingPosts.length === 0) {
      return sendResponse(
        HttpStatus.NO_CONTENT,
        message.post.get_following_post.no_content,
      );
    }
    //sign token with payload final post id
    const finalPost = followingPosts[followingPosts.length - 1];
    const cursorPayload = { id: finalPost.id };
    const cursorToken = await this.jwtService.signAsync(cursorPayload);
    //send response
    const data = {
      posts: followingPosts,
      cursor: cursorToken,
    };
    return sendResponse(
      HttpStatus.OK,
      message.post.get_following_post.success,
      data,
    );
  }
  /**
   * search post by key
   * @param currentUser
   * @param searchPostDTO
   * @param cursor
   * @returns
   */
  async getPostsByKey(
    currentUser: AuthUser,
    searchPostDTO: SearchPostDTO,
    cursor?: string,
  ) {
    //check if has cursor
    let cursorDecoded: Cursor | undefined;
    if (cursor) {
      try {
        cursorDecoded = await this.jwtService.verifyAsync<Cursor>(cursor);
      } catch {
        throw new BadRequestException(
          message.post.get_post_by_key.cursor_invalid,
        );
      }
    } else {
      cursorDecoded = undefined;
    }
    //get posts by key
    const postsByKey = await this.postRepo.getPostsByKey(
      currentUser,
      searchPostDTO,
      cursorDecoded,
    );
    //check if has any post
    if (postsByKey.length === 0) {
      return sendResponse(
        HttpStatus.NO_CONTENT,
        message.post.get_post_by_key.no_content,
      );
    }
    //sign token with payload final post id
    const finalPost = postsByKey[postsByKey.length - 1];
    const cursorPayload = { id: finalPost.id };
    const cursorToken = await this.jwtService.signAsync(cursorPayload);
    //send response
    const data = {
      posts: postsByKey,
      cursor: cursorToken,
    };
    return sendResponse(
      HttpStatus.OK,
      message.post.get_post_by_key.success,
      data,
    );
  }
  /**
   * listen comment
   * @param postIdDTO
   * @returns
   */
  async listenComment(postIdDTO: PostIdDTO, currentUser: AuthUser) {
    const postFound = await this.postRepo.findPostById(postIdDTO.postId);
    if (!postFound) {
      throw new NotFoundException(message.post.listen_comment.post_not_found);
    }
    return new Observable((commentSubscriber) => {
      const listenedComment = this.commentBus.subscribe(
        (comment: CommentEntity) => {
          if (comment.post.id === postFound.id) {
            //get detail comment
            this.postRepo
              .getDetailComment(comment.id, postFound.id, currentUser)
              .then((detailComment) => {
                commentSubscriber.next({ data: detailComment });
              })
              .catch((err) => {
                commentSubscriber.error(err);
              });
          }
        },
      );
      return () => listenedComment.unsubscribe();
    });
  }
  /**
   * comment
   * @param currentUser
   * @param postIdDTO
   * @param commentPostDTO
   * @returns
   */
  async createComment(
    currentUser: AuthUser,
    postIdDTO: PostIdDTO,
    createCommentDTO: CreateCommentDTO,
  ) {
    //check if user exist
    const userFound = await this.postRepo.findUserbyUsername(
      currentUser.username,
    );
    if (!userFound) {
      throw new NotFoundException(message.post.comment.user_not_found);
    }
    //check if post exist
    const postFound = await this.postRepo.findPostById(postIdDTO.postId);
    if (!postFound) {
      throw new NotFoundException(message.post.comment.post_not_found);
    }
    //check if content is toxic
    const { content, mentionedUser } = createCommentDTO;
    await this.httpsService.checkToxic(content);
    //filter self
    const mentionedUserFilter = mentionedUser.filter(
      (username) => username !== currentUser.username,
    );
    //find mentioned users in db
    const mentionedUsersFound =
      await this.postRepo.findUsersByUsername(mentionedUserFilter);
    //create comment
    const createdComment = await this.postRepo.createComment(
      content,
      postFound,
      userFound,
      mentionedUsersFound,
    );
    //return to listen
    this.commentBus.next(createdComment);
    //notify to author, if commenter is author don't notify
    if (createdComment.commenter.id != postFound.author.id) {
      await this.notificationQueue.add(
        String(JobNotificationQueue.COMMENT),
        {
          comment: createdComment,
        },
        { priority: 4 },
      );
    }
    //if has mentioned user, notify to all mentioned user
    if (mentionedUsersFound.length > 0) {
      await this.notificationQueue.add(
        String(JobNotificationQueue.MENTION_COMMENT),
        {
          mentionedUser: mentionedUsersFound,
          comment: createdComment,
        },
        { priority: 5 },
      );
    }
    //send response
    return sendResponse(HttpStatus.OK, message.post.comment.success);
  }
  /**
   * get comment
   */
  async getComments(
    currentUser: AuthUser,
    postIdDTO: PostIdDTO,
    cursor?: string,
  ) {
    const { postId } = postIdDTO;
    //check if post exist
    const postFound = await this.postRepo.findPostById(postId);
    if (!postFound) {
      throw new NotFoundException(message.post.get_comment.post_not_found);
    }
    //check if has cursor
    let cursorDecoded: Cursor | undefined;
    if (cursor) {
      try {
        cursorDecoded = await this.jwtService.verifyAsync<Cursor>(cursor);
      } catch {
        throw new BadRequestException(message.post.get_comment.cursor_invalid);
      }
    } else {
      cursorDecoded = undefined;
    }
    //get comment
    const comments = await this.postRepo.getCommentsByPostId(
      postId,
      currentUser,
      cursorDecoded,
    );
    //check if has any comment
    if (comments.length == 0) {
      return sendResponse(
        HttpStatus.NO_CONTENT,
        message.post.get_comment.no_content,
      );
    }
    //sign token
    const finalComment = comments[comments.length - 1];
    const cursorPayload = { id: finalComment.id };
    const cursorToken = await this.jwtService.signAsync(cursorPayload);
    const data = { comments: comments, cursor: cursorToken };
    //send response
    return sendResponse(HttpStatus.OK, message.post.get_comment.success, data);
  }
  /**
   * get detail comment
   */
  async getDetailComment(
    currentUser: AuthUser,
    detailCommentDTO: DetailCommentDTO,
  ) {
    const { commentId, postId } = detailCommentDTO;
    //get comment
    const commentFound = await this.postRepo.getDetailComment(
      commentId,
      postId,
      currentUser,
    );
    if (!commentFound) {
      throw new NotFoundException(message.post.get_detail_comment.not_found);
    }
    //send response
    return sendResponse(
      HttpStatus.OK,
      message.post.get_detail_comment.success,
      commentFound,
    );
  }
  /**
   * update comment
   */
  async updateComment(
    currentUser: AuthUser,
    detailCommentDTO: DetailCommentDTO,
    updateCommentDTO: UpdateCommentDTO,
  ) {
    const { sub } = currentUser;
    const { commentId, postId } = detailCommentDTO;
    //check if comment exist right post right commenter
    const commentFound = await this.postRepo.findComment(
      commentId,
      sub,
      postId,
    );
    if (!commentFound) {
      throw new NotFoundException(message.post.update_comment.not_found);
    }
    //check toxic
    const { mentionedUser, content } = updateCommentDTO;
    await this.httpsService.checkToxic(content);
    //filter self
    let mentionedUserFilter: string[] = [];
    if (mentionedUser) {
      mentionedUserFilter = mentionedUser.filter(
        (username) => username !== currentUser.username,
      );
    }
    //get mentioned user in db
    const mentionedUserFound =
      await this.postRepo.findUsersByUsername(mentionedUserFilter);
    //update comment
    const commentEntity: CommentEntity = {
      ...commentFound,
      content: content,
      mentionedUser: mentionedUserFound,
    };
    const updatedComment = await this.postRepo.updateComment(commentEntity);
    //filter new mentioned user
    const oldMentionedUserIds = new Set(
      (commentFound.mentionedUser ?? []).map((u) => u.id),
    );
    const newMentionUser = mentionedUserFound.filter(
      (user) => !oldMentionedUserIds.has(user.id),
    );
    //notify to new mentioned user
    if (newMentionUser.length > 0) {
      await this.notificationQueue.add(
        String(JobNotificationQueue.MENTION_COMMENT),
        {
          mentionedUser: newMentionUser,
          comment: updatedComment,
        },
        { priority: 5 },
      );
    }
    //send response
    return sendResponse(
      HttpStatus.OK,
      message.post.update_comment.success,
      updatedComment,
    );
  }
  /**
   * delete comment
   */
  async deleteComment(
    currentUser: AuthUser,
    detailCommentDTO: DetailCommentDTO,
  ) {
    const { sub } = currentUser;
    const { commentId, postId } = detailCommentDTO;
    //check if comment exist, right commenter, right post
    const commentFound = await this.postRepo.findComment(
      commentId,
      sub,
      postId,
    );
    if (!commentFound) {
      throw new NotFoundException(message.post.delete_comment.not_found);
    }
    //delete comment
    await this.postRepo.deleteComment(commentFound.id);
    //send response
    return sendResponse(HttpStatus.OK, message.post.delete_comment.success);
  }
}
