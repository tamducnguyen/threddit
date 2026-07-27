import { IsBoolean, IsInt, Min } from 'class-validator';

export class TypingDTO {
  @IsInt({ message: 'Id cuộc trò chuyện phải là số nguyên' })
  @Min(1, { message: 'Id cuộc trò chuyện không hợp lệ' })
  conversationId: number;

  @IsBoolean({ message: 'Trạng thái gõ phải là boolean' })
  isTyping: boolean;
}
