import { ContentType } from 'src/enum/contenttype.enum';
import { ReactionType } from 'src/enum/reactiontype.enum';
import { MediaFileDTO } from 'src/common/interface/media-file.interface';
import { UserDTO } from 'src/common/interface/user.interface';

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
