import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class SummarizeDTO {
  @IsString({ message: 'Chủ đề phải là chuỗi' })
  @IsNotEmpty({ message: 'Chủ đề không được để trống' })
  @MaxLength(200, { message: 'Chủ đề không được vượt quá 200 ký tự' })
  topic: string;
}
