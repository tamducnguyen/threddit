import { MediaFileDTO } from 'src/common/interface/media-file.interface';
import { UserDTO } from 'src/common/interface/user.interface';
import { ReactionType } from 'src/enum/reactiontype.enum';

export interface DetailComment {
  id: number;
  text: string | null;
  mediaFiles: MediaFileDTO[];
  commenter: UserDTO;
  isCommenter: boolean;
  parentComment: DetailComment | null;
  hasChildComment: boolean;
  mentionedUsers: UserDTO[];
  reaction: ReactionType | null;
  createdAt: Date;
  updatedAt: Date;
}
