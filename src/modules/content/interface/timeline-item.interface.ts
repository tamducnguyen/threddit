import { ReactionType } from 'src/modules/enum/reactiontype.enum';
import { UserDTO } from './user.interface';
import { MediaFileDTO } from './media-file.interface';
import { ContentType } from 'src/modules/enum/contenttype.enum';

export interface TimelineItem {
  contentId: number;
  timelineItemId: number;
  timelineCreatedAt: Date;
  contentCreatedAt: Date;
  contentUpdatedAt: Date;
  sharedAt: Date | null;
  timelineItemType: 'create' | 'share';
  isTimelineItemOwner: boolean;
  timelineOwner: UserDTO;
  isShared: boolean;
  sharedMessage: string | null;
  author: UserDTO;
  mentionedUsers: UserDTO[];
  text: string | null;
  mediaFiles: MediaFileDTO[];
  contentType: ContentType;
  commentNumber: number;
  saveNumber: number;
  shareNumber: number;
  reactionNumber: number;
  isSaved: boolean;
  reaction: ReactionType | null;
}
