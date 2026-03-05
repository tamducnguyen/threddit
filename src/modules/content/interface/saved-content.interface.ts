import { ContentDetail } from './content-detail.interface';

export interface SavedContent extends ContentDetail {
  saveId: number;
  savedAt: Date;
}
