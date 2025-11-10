export const FollowNotification = (followerName: string) =>
  `${followerName} đã bắt đầu theo dõi bạn`;
export const CreatePostNotification = (authorUsername: string) =>
  `${authorUsername} vừa mới đăng bài viết`;
export const MentionNotification = (authorUsername: string) =>
  `${authorUsername} đã nhắc đến bạn trong bài viêt mới`;
export const CommentNotification = (
  commenterUsername: string,
  content: string,
) => `${commenterUsername} đã bình luận '${content}' vào bài viết của bạn`;
export const MentionCommentNotification = (
  commenterUsername: string,
  content: string,
) =>
  `${commenterUsername} đã nhắc tới bạn trong bình luận '${content}' của một bài viết`;
export enum JobNotificationQueue {
  CREATE_POST = 'sendCreatedPostNotification',
  MENTION = 'sendMentionNotification',
  FOLLOW = 'sendFollowNotification',
  COMMENT = 'sendCommentNotification',
  MENTION_COMMENT = 'sendMentionCommentNotification',
}
export const NameNotificationQueue = 'notification';
