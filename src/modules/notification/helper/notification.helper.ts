export enum JobNotificationQueue {
  CONTENT_CREATION = 'sendContentCreationNotification',
  MENTION_IN_CONTENT = 'sendMentionInContentNotification',
  FOLLOW = 'sendFollowNotification',
  COMMENT = 'sendCommentNotification',
  REACTION_CONTENT = 'sendReactionContentNotification',
  REACTION_COMMENT = 'sendReactionCommentNotification',
  FRIEND_REQUEST = 'sendFriendRequestNotification',
  FRIEND_ACCEPTED = 'sendFriendAcceptedNotification',
  MENTION_IN_COMMENT = 'sendMentionCommentNotification',
  REPLY_COMMENT = 'sendReplyCommentNotification',
}

export const NameNotificationQueue = 'notification';
