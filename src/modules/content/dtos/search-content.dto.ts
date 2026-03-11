import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SearchContentDTO {
  @IsString({ message: 'Từ khóa phải là một chuỗi' })
  @IsNotEmpty({ message: 'Từ khóa không được để trống' })
  key: string;

  @IsOptional()
  @IsString({ message: 'Con trỏ phải là một chuỗi' })
  @IsNotEmpty({ message: 'Con trỏ không được để trống' })
  cursor?: string;
}
