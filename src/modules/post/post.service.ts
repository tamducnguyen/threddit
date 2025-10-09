import {
  BadRequestException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PostRepository } from './post.repository';
import { Cursor } from '../interface/cursor.interface';
import { message } from '../common/helper/message.helper';
import { JwtService } from '@nestjs/jwt';
import { sendResponse } from '../common/helper/response.helper';
import { PostMetrics } from './interface/postmetric.interface';

@Injectable()
export class PostService {
  constructor(
    private readonly postRepo: PostRepository,
    private readonly jwtService: JwtService,
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
        saveNumber: Number(postMetric.commentNumber),
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
        saveNumber: Number(postMetric.commentNumber),
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
}
