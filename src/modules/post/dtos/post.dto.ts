import { UserEntity } from 'src/modules/entities/user.entity';

export class PostDTO {
  id: number;
  content: string;
  author: UserEntity;
  isPinned: boolean;
  mentionedUser: UserEntity[];
  commentNumber: number;
  saveNumber: number;
  upvoteNumber: number;
  downvoteNumber: number;
  isUpvote: boolean;
  isSaved: boolean;
  createdAt: Date;
  updatedAt: Date;
}
