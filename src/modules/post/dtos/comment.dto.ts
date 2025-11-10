import { PostEntity } from 'src/modules/entities/post.entity';
import { UserEntity } from 'src/modules/entities/user.entity';

export class CommentDTO {
  id: number;
  content: string;
  post: PostEntity;
  commenter: UserEntity;
  mentionedUser: UserEntity[];
  createdAt: Date;
  updatedAt: Date;
  isCommenter: boolean;
}
