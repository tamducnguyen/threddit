import { ContentType } from 'src/modules/enum/contenttype.enum';

export const FollowNotificationMessage = (followerDisplayName: string) =>
  `${followerDisplayName} đã bắt đầu theo dõi bạn`;
export const FriendContentCreationNotificationMessage = (
  authorDisplayName: string,
  contentType: ContentType,
) => `${authorDisplayName} vừa mới đăng tải ${contentType} mới`;
export const FollowingContentCreationNotificationMessage = (
  authorDisplayName: string,
  contentType: ContentType,
) => `${authorDisplayName} vừa mới đăng tải ${contentType} mới`;
export const FriendRequestNotificationMessage = (
  requesterDisplayName: string,
) => `${requesterDisplayName} gửi yêu cầu kết bạn`;
export const FriendAcceptedNotificationMessage = (friendDisplayName: string) =>
  `${friendDisplayName} chấp nhận lời mời kết bạn của bạn`;
export const FriendConnectedNotificationMessage = (friendDisplayName: string) =>
  `Bạn từ bây giờ đã là bạn bè với ${friendDisplayName}`;
export const MentionInContentNotificationMessage = (
  authorDisplayName: string,
  contentType: ContentType,
) => `${authorDisplayName} đã nhắc đến bạn trong ${contentType} mới`;
export const CommentNotificationMessage = (commenterDisplayname: string) =>
  `${commenterDisplayname} đã bình luận vào bài viết của bạn`;
export const ReactionContentNotificationMessage = (
  reacterDisplayName: string,
) => `${reacterDisplayName} đã thả cảm xúc vào bài viết của bạn`;
export const MentionInCommentNotificationMessage = (
  commenterDisplayName: string,
) => `${commenterDisplayName} đã nhắc tới bạn trong bình luận của một bài đăng`;

export enum JobNotificationQueue {
  CONTENT_CREATION = 'sendContentCreationNotification',
  MENTION_IN_CONTENT = 'sendMentionInContentNotification',
  FOLLOW = 'sendFollowNotification',
  COMMENT = 'sendCommentNotification',
  REACTION_CONTENT = 'sendReactionContentNotification',
  FRIEND_REQUEST = 'sendFriendRequestNotification',
  FRIEND_ACCEPTED = 'sendFriendAcceptedNotification',
  MENTION_IN_COMMENT = 'sendMentionCommentNotification',
}

export const NameNotificationQueue = 'notification';
