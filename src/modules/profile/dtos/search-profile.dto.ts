import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SearchProfileDTO {
  @IsString({ message: 'Từ khóa phải lầ một chuỗi' })
  @IsNotEmpty({ message: 'Từ khóa không được rỗng' })
  key: string;

  @IsOptional()
  @IsString({ message: 'Con trỏ phải là một chuỗi' })
  @IsNotEmpty({ message: 'Con trỏ không được để rỗng' })
  cursor?: string;
}
