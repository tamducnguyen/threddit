import { ConversationType } from 'src/enum/conversation-type.enum';
import { ConversationMemberRole } from 'src/enum/conversation-member-role.enum';
import { UserWithId } from 'src/common/interface/user-with-id.interface';
import { Message } from 'src/common/interface/message.interface';

/**
 * An inbox entry: the conversation plus its latest-message preview and the
 * other members (everyone except the requester) for rendering avatars/titles.
 * `pinned` and `myRole` reflect the requester's own membership row, not
 * conversation-wide state.
 */
export interface ConversationSummary {
  id: number;
  type: ConversationType;
  name: string;
  pinned: boolean;
  myRole: ConversationMemberRole;
  unreadCount: number;
  members: UserWithId[];
  lastMessage: Message | null;
}
