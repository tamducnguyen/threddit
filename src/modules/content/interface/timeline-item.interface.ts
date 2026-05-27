import { ContentDetail } from './content-detail.interface';
import { UserDTO } from 'src/common/interface/user.interface';

export interface TimelineItem extends ContentDetail {
  shareId: number | null;
  sharedAt: Date | null;
  sharer: UserDTO | null;
  shareMessage: string | null;
  isSharer: boolean;
}
