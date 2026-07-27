import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class MessageIdParamDTO {
  @Type(() => Number)
  @IsInt({ message: 'Id tin nhắn phải là số nguyên' })
  @Min(1, { message: 'Id tin nhắn không hợp lệ' })
  messageId: number;
}
