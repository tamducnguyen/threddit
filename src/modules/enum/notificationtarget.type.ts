import { ContentType } from './contenttype.enum';

export type NotificationTarget =
  | {
      type: 'REACTION_CONTENT';
      contentId: number;
      reactionId: number;
      actorId: number;
    }
  | {
      type: 'REACTION_COMMENT';
      commentId: number;
      reactionId: number;
      actorId: number;
    }
  | {
      type: 'COMMENT';
      contentId: number;
      commentId: number;
      actorId: number;
    }
  | {
      type: 'REPLY_COMMENT';
      contentId: number;
      commentId: number;
      actorId: number;
    }
  | {
      type: 'FOLLOWING_CONTENT_CREATION';
      contentId: number;
      contentType: ContentType;
      actorId: number;
    }
  | {
      type: 'FRIEND_CONTENT_CREATION';
      contentId: number;
      contentType: ContentType;
      actorId: number;
    }
  | {
      type: 'MENTION_IN_CONTENT';
      contentId: number;
      contentType: ContentType;
      actorId: number;
    }
  | {
      type: 'FOLLOW';
      actorId: number;
    }
  | {
      type: 'MENTION_IN_COMMENT';
      contentId: number;
      commentId: number;
      actorId: number;
    }
  | {
      type: 'FRIEND_REQUEST';
      actorId: number;
    }
  | {
      type: 'FRIEND_ACCEPTED';
      actorId: number;
    };
