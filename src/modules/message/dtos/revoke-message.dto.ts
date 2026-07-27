import { IsInt, Min } from 'class-validator';

export class RevokeMessageDTO {
  @IsInt({ message: 'Id tin nhắn phải là số nguyên' })
  @Min(1, { message: 'Id tin nhắn không hợp lệ' })
  messageId: number;
}
