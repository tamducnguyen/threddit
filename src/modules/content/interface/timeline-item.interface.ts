import { ContentDetail } from './content-detail.interface';
import { UserDTO } from './user.interface';

export interface TimelineItem extends ContentDetail {
  shareId: number | null;
  sharedAt: Date | null;
  sharer: UserDTO | null;
  shareMessage: string | null;
}
