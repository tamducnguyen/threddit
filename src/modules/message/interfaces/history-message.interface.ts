import { Message } from 'src/common/interface/message.interface';
import { ReactionCount } from './reaction-count.interface';

/**
 * A message as returned by conversation history: the base shape plus the
 * revoke flag and the aggregated reaction counts. Revoked messages carry a
 * nulled `text` so clients render a "message recalled" placeholder.
 */
export interface HistoryMessage extends Message {
  isRevoked: boolean;
  reactions: ReactionCount[];
}
