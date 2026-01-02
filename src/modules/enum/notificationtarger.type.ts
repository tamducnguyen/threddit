export type NotificationTarget =
  | {
      type: 'REACTION_CONTENT';
      contentId: number;
      reactionId: number;
      actorUsername: string;
      actorAvatarUrl: string;
    }
  | {
      type: 'REACTION_COMMENT';
      commentId: number;
      reactionId: number;
      actorUsername: string;
      actorAvatarUrl: string;
    }
  | {
      type: 'COMMENT';
      contentId: number;
      commentId: number;
      actorUsername: string;
      actorAvatarUrl: string;
    }
  | {
      type: 'FOLLOWEE_POST';
      contentId: number;
      actorUsername: string;
      actorAvatarUrl: string;
    }
  | {
      type: 'FRIEND_POST';
      contentId: number;
      actorUsername: string;
      actorAvatarUrl: string;
    }
  | {
      type: 'MENTION_IN_POST';
      contentId: number;
      actorUsername: string;
      actorAvatarUrl: string;
    }
  | {
      type: 'FOLLOW';
      actorUsername: string;
      actorAvatarUrl: string;
    }
  | {
      type: 'MENTION_IN_COMMENT';
      contentId: number;
      commentId: number;
      actorUsername: string;
      actorAvatarUrl: string;
    }
  | {
      type: 'FRIEND_REQUEST';
      actorUsername: string;
      actorAvatarUrl: string;
    };
