import { MediaFile } from './media-file.interface';
import { UserWithId } from './user-with-id.interface';

/** Minimal shape of the original message embedded in a reply preview. */
export interface MessageReply {
  id: number;
  text?: string;
  isRevoked: boolean;
  sender: UserWithId;
}

/**
 * The base message shape shared across domains: the conversation/inbox layer
 * embeds it as a last-message preview, the message layer extends it with
 * history/reaction metadata.
 */
export interface Message {
  id: number;
  text?: string;
  createdAt: Date;
  editedAt?: Date | null;
  sender: UserWithId;
  mediaFiles: MediaFile[];
  replyTo?: MessageReply | null;
  mentionedUsers?: UserWithId[];
}
