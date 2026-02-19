import { ReactionType } from 'src/modules/enum/reactiontype.enum';
import { MediaFileDTO } from './media-file.interface';
import { UserDTO } from './user.interface';

export interface PinnedContent {
  id: number;
  createdAt: Date;
  updatedAt: Date;
  isShared: boolean;
  isOwner: boolean;
  author: UserDTO;
  mentionedUsers: UserDTO[];
  text: string | null;
  mediaFiles: MediaFileDTO[];
  type: string;
  commentNumber: number;
  saveNumber: number;
  shareNumber: number;
  reactionNumber: number;
  isSaved: boolean;
  reaction: ReactionType | null;
}
