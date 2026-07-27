import { IsInt, Min } from 'class-validator';

export class WsMarkReadDTO {
  @IsInt({ message: 'Id cuộc trò chuyện phải là số nguyên' })
  @Min(1, { message: 'Id cuộc trò chuyện không hợp lệ' })
  conversationId: number;

  @IsInt({ message: 'Id tin nhắn phải là số nguyên' })
  @Min(1, { message: 'Id tin nhắn không hợp lệ' })
  lastReadMessageId: number;
}
