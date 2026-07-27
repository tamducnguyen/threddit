import { IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class SearchMessageDTO {
  @IsString({ message: 'Từ khóa tìm kiếm phải là chuỗi' })
  @IsNotEmpty({ message: 'Từ khóa tìm kiếm không được để trống' })
  @MinLength(2, { message: 'Từ khóa tìm kiếm phải có ít nhất 2 ký tự' })
  key: string;

  @IsOptional()
  @IsString({ message: 'Con trỏ phải là chuỗi' })
  cursor?: string;
}
