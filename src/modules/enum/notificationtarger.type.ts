import { ContentType } from './contenttype.enum';

export type NotificationTarget =
  | {
      type: 'REACTION_CONTENT';
      contentId: number;
      reactionId: number;
      actorUsername: string;
      actorDisplayName: string;
      actorAvatarUrl: string;
    }
  | {
      type: 'REACTION_COMMENT';
      commentId: number;
      reactionId: number;
      actorUsername: string;
      actorDisplayName: string;
      actorAvatarUrl: string;
    }
  | {
      type: 'COMMENT';
      contentId: number;
      commentId: number;
      actorUsername: string;
      actorDisplayName: string;
      actorAvatarUrl: string;
    }
  | {
      type: 'FOLLOWING_CONTENT_CREATION';
      contentId: number;
      contentType: ContentType;
      actorUsername: string;
      actorDisplayName: string;
      actorAvatarUrl: string;
    }
  | {
      type: 'FRIEND_CONTENT_CREATION';
      contentId: number;
      contentType: ContentType;
      actorUsername: string;
      actorDisplayName: string;
      actorAvatarUrl: string;
    }
  | {
      type: 'MENTION_IN_CONTENT';
      contentId: number;
      contentType: ContentType;
      actorUsername: string;
      actorDisplayName: string;
      actorAvatarUrl: string;
    }
  | {
      type: 'FOLLOW';
      actorUsername: string;
      actorDisplayName: string;
      actorAvatarUrl: string;
    }
  | {
      type: 'MENTION_IN_COMMENT';
      contentId: number;
      commentId: number;
      actorUsername: string;
      actorDisplayName: string;
      actorAvatarUrl: string;
    }
  | {
      type: 'FRIEND_REQUEST';
      actorUsername: string;
      actorDisplayName: string;
      actorAvatarUrl: string;
    };
