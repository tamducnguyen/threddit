export const FollowNotification = (followerName: string) =>
  `${followerName} đã bắt đầu theo dõi bạn`;
export const CreatePostNotification = (authorUsername: string) =>
  `${authorUsername} vừa mới đăng bài viết`;
export const MentionNotification = (authorUsername: string) =>
  `${authorUsername} đã nhắc đến bạn trong bài viêt mới`;
export enum JobNotificationQueue {
  CREATE_POST = 'sendCreatedPostNotification',
  MENTION = 'sendMentionNotification',
  FOLLOW = 'sendFollowNotification',
}
export const NameNotificationQueue = 'notification';
