import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class ConversationIdDTO {
  @Type(() => Number)
  @IsInt({ message: 'Id cuộc trò chuyện phải là số nguyên' })
  @Min(1, { message: 'Id cuộc trò chuyện không hợp lệ' })
  conversationId: number;
}
