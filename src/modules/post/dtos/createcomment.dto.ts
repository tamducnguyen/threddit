import { ArrayUnique, IsArray, IsNotEmpty, IsString } from 'class-validator';

export class CreateCommentDTO {
  @IsString({ message: 'Nội dung bình luận phải là một chuỗi' })
  @IsNotEmpty({ message: 'Nội dung bình luận không được bỏ trống' })
  content: string;
  @IsArray({ message: 'Danh sách tên người dùng phải là một mảng' })
  @ArrayUnique({ message: 'Danh sách tên người dùng có phần tử trùng lặp' })
  @IsString({
    each: true,
    message: 'Mỗi tên người dùng phải là chuỗi hợp lệ',
  })
  mentionedUser: string[];
}
