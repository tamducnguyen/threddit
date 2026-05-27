import { ContentType } from 'src/enum/contenttype.enum';
import { ReactionType } from 'src/enum/reactiontype.enum';
import { MediaFile } from 'src/common/interface/media-file.interface';
import { User } from 'src/common/interface/user.interface';

export interface ContentDetail {
  id: number;
  createdAt: Date;
  updatedAt: Date;
  text: string | null;
  type: ContentType;
  isPinned: boolean;
  isOwner: boolean;
  author: User;
  mentionedUsers: User[];
  mediaFiles: MediaFile[];
  commentNumber: number;
  saveNumber: number;
  shareNumber: number;
  reactionNumber: number;
  isSaved: boolean;
  isShared: boolean;
  reaction: ReactionType | null;
}
