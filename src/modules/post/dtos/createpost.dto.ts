import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class PostDTO {
  @IsString()
  @IsNotEmpty()
  content: string;
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty({ message: 'Danh sách tên người dùng không được rỗng' })
  @ArrayUnique({ message: 'Danh sách tên người dùng có phần tử trùng lặp' })
  @IsString({
    each: true,
    message: 'Mỗi tên người dùng phải là chuỗi hợp lệ',
  })
  mentionedUser: string[];
}
