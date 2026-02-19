import { ReactionType } from 'src/modules/enum/reactiontype.enum';
import { MediaFileDTO } from '../interface/media-file.interface';
import { UserDTO } from './user.interface';

export class SavedContent {
  saveId: number;
  savedAt: Date;
  contentId: number;
  contentCreatedAt: Date;
  contentUpdatedAt: Date;
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
