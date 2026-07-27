import { IsInt, Min } from 'class-validator';

export class MarkReadDTO {
  @IsInt({ message: 'Id tin nhắn phải là số nguyên' })
  @Min(1, { message: 'Id tin nhắn không hợp lệ' })
  lastReadMessageId: number;
}
