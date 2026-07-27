import { Message } from 'src/common/interface/message.interface';
import { ConversationType } from 'src/enum/conversation-type.enum';

export interface Conversation {
  id: number;
  type: ConversationType;
  name: string;
  lastMessage: Message;
}
