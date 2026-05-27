import { ContentDetail } from './content-detail.interface';
import { User } from 'src/common/interface/user.interface';

export interface TimelineItem extends ContentDetail {
  shareId: number | null;
  sharedAt: Date | null;
  sharer: User | null;
  shareMessage: string | null;
  isSharer: boolean;
}
