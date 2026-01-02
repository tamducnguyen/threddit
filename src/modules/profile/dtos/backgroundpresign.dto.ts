import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class BackgroundPresignDTO {
  @IsString({ message: 'Content type phải là chuỗi' })
  @IsNotEmpty({ message: 'Content type không được để trống' })
  contentType: string;

  @IsInt({ message: 'Content length phải là số nguyên' })
  @Min(1, { message: 'Content length phải lớn hơn 0' })
  contentLength: number;
}
