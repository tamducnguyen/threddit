import { MediaFile } from 'src/common/interface/media-file.interface';
import { User } from 'src/common/interface/user.interface';
import { ReactionType } from 'src/enum/reactiontype.enum';

export interface DetailComment {
  id: number;
  text: string | null;
  mediaFiles: MediaFile[];
  commenter: User;
  isCommenter: boolean;
  parentComment: DetailComment | null;
  hasChildComment: boolean;
  mentionedUsers: User[];
  reaction: ReactionType | null;
  createdAt: Date;
  updatedAt: Date;
}
