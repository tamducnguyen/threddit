import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class PostDTO {
  @IsString({ message: 'Nội dung phải là chuỗi hợp lệ' })
  @IsNotEmpty({ message: 'Nội dung không được để trống' })
  content: string;
  @IsOptional()
  @IsArray({ message: 'Danh sách tên người dùng phải là một mảng' })
  @ArrayNotEmpty({ message: 'Danh sách tên người dùng không được rỗng' })
  @ArrayUnique({ message: 'Danh sách tên người dùng có phần tử trùng lặp' })
  @IsString({
    each: true,
    message: 'Mỗi tên người dùng phải là chuỗi hợp lệ',
  })
  mentionedUser: string[];
}
