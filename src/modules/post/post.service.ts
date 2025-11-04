import {
  BadRequestException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PostRepository } from './post.repository';
import { Cursor } from '../interface/cursor.interface';
import { message } from '../common/helper/message.helper';
import { JwtService } from '@nestjs/jwt';
import { sendResponse } from '../common/helper/response.helper';
import { PostMetrics } from './interface/postmetric.interface';
import { PostDTO } from './dtos/createpost.dto';
import { AuthUser } from '../token/authuser.interface';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { ToxicResponse } from './interface/toxicresponse.interface';
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

@Injectable()
export class PostService {
  constructor(
    private readonly postRepo: PostRepository,
    private readonly jwtService: JwtService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @InjectQueue(NameNotificationQueue)
    private readonly notificationQueue: Queue,
  ) {}
  async getCreatedPost(username: string, cursor?: string) {
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
      rawPosts.map((post) => post.id),
    );
    const posts = rawPosts.map((post) => {
      const postMetric = postMetrics[Number(post.id)] as PostMetrics;
      return {
        id: post.id,
        content: post.content,
        isPinned: post.isPinned,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
        mentionedUser: post.mentionedUser,
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
  async getSavedPost(username: string, cursor?: string) {
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
    const rawPosts = saves.map((save) => save.savedPost);
    //check if no content
    const finalPosts = rawPosts[rawPosts.length - 1];
    if (!finalPosts) {
      return sendResponse(
        HttpStatus.NO_CONTENT,
        message.post.get_saved_post.no_content,
      );
    }
    //sign cursor
    const cursorPayload = { id: finalPosts.id };
    const cursorToken = await this.jwtService.signAsync(cursorPayload);
    //get neccessary data
    const postMetrics = await this.postRepo.getPostMetrics(
      rawPosts.map((post) => post.id),
    );
    const posts = rawPosts.map((post) => {
      const postMetric = postMetrics[Number(post.id)] as PostMetrics;
      return {
        id: post.id,
        content: post.content,
        isPinned: post.isPinned,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
        mentionedUser: post.mentionedUser,
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
  async createPost(currentUser: AuthUser, postDTO: PostDTO) {
    //check if user exist, if not throw a NotFoundException
    const { username } = currentUser;
    const currentUserFound = await this.postRepo.findUserbyUsername(username);
    if (!currentUserFound) {
      throw new NotFoundException(message.post.create_post.user_not_found);
    }
    //check if content is toxic, if toxic throw a BadRequestexception or a InternalServerError
    const { content, mentionedUser } = postDTO;
    const checkToxicResponse = await firstValueFrom(
      this.httpService.post(this.configService.getOrThrow('URL_AI'), {
        text: content,
      }),
    );
    if (checkToxicResponse.status !== 200) {
      throw new InternalServerErrorException(
        message.post.create_post.server_error,
      );
    }
    const data = checkToxicResponse.data as ToxicResponse;
    if (data.type !== 0) {
      throw new BadRequestException(message.post.create_post.toxic_post);
    }
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
          postCreated: postCreated,
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
    //send ok response
    return sendResponse(
      HttpStatus.OK,
      message.post.create_post.success,
      postCreated,
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
}
