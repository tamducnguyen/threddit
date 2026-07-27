import { IsInt, IsString, Min, MinLength } from 'class-validator';

export class EditMessageDTO {
  @IsInt({ message: 'Id tin nhắn phải là số nguyên' })
  @Min(1, { message: 'Id tin nhắn không hợp lệ' })
  messageId: number;

  @IsString({ message: 'Nội dung tin nhắn phải là chuỗi' })
  @MinLength(1, { message: 'Nội dung tin nhắn không được để trống' })
  text: string;
}
