import { MediaFileDTO } from 'src/modules/content/interface/media-file.interface';
import { UserDTO } from 'src/modules/content/interface/user.interface';
import { ReactionType } from 'src/modules/enum/reactiontype.enum';

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
