import { ContentType } from 'src/modules/enum/contenttype.enum';
import { ReactionType } from 'src/modules/enum/reactiontype.enum';
import { MediaFileDTO } from './media-file.interface';
import { UserDTO } from './user.interface';

export interface ContentDetail {
  id: number;
  createdAt: Date;
  updatedAt: Date;
  text: string | null;
  type: ContentType;
  isPinned: boolean;
  isOwner: boolean;
  author: UserDTO;
  mentionedUsers: UserDTO[];
  mediaFiles: MediaFileDTO[];
  commentNumber: number;
  saveNumber: number;
  shareNumber: number;
  reactionNumber: number;
  isSaved: boolean;
  isShared: boolean;
  reaction: ReactionType | null;
}
