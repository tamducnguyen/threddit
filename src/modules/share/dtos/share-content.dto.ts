import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ShareContentDTO {
  @IsOptional()
  @IsString({ message: 'Nội dung chia sẻ phải là chuỗi' })
  @MaxLength(500, {
    message: 'Nội dung chia sẻ không được vượt quá 500 ký tự',
  })
  message?: string;
}
