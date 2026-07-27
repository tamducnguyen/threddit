import { Conversation } from '../../conversation/interfaces/conversation.interface';
import { Message } from 'src/common/interface/message.interface';

export interface SentMessage extends Message {
  conversation: Conversation;
}
