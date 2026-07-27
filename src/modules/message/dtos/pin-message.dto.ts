import { IsBoolean, IsInt, Min } from 'class-validator';

export class PinMessageDTO {
  @IsInt({ message: 'Id tin nhắn phải là số nguyên' })
  @Min(1, { message: 'Id tin nhắn không hợp lệ' })
  messageId: number;

  @IsBoolean({ message: 'pinned phải là giá trị boolean' })
  pinned: boolean;
}
