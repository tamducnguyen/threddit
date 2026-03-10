import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdateCommentDTO {
  @IsOptional()
  @IsString({ message: 'Nội dung bình luận phải là chuỗi' })
  text?: string;

  @IsOptional()
  @IsString({ message: 'uploadSessionId phải là chuỗi' })
  uploadSessionId?: string;

  @IsOptional()
  @IsBoolean({ message: 'removeMedia phải là true hoặc false' })
  removeMedia?: boolean;

  @IsOptional()
  @IsArray({ message: 'Danh sách người dùng được đề cập phải là một mảng' })
  @ArrayMaxSize(10, {
    message: 'Danh sách người dùng được đề cập chỉ tối đa 10 phần tử',
  })
  @ArrayUnique({
    message: 'Mỗi username được đề cập chỉ được xuất hiện một lần',
  })
  @IsString({ each: true, message: 'Mỗi username được đề cập phải là chuỗi' })
  mentionedUsers?: string[];
}
