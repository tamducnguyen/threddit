export interface TimelineCursor {
  timelineCreatedAt: string | Date;
  timelineId: number;
  timelineType: 'create' | 'share';
}
