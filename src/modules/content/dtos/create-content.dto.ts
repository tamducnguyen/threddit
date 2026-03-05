import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';
import { ContentType } from 'src/modules/enum/contenttype.enum';

export class CreateContentDTO {
  @IsString()
  @IsOptional()
  text: string;
  @IsOptional()
  @IsArray({ message: 'Danh sách bạn bè được đề cập là một array' })
  @ArrayMaxSize(10, { message: 'Giới hạn đề cập là 10 bạn bè' })
  @ArrayUnique({ message: 'Mỗi tên người dùng là duy nhất trong danh sách' })
  @IsString({ each: true, message: 'Username phải là một chuỗi' })
  mentionedUsers?: string[];
  @IsOptional()
  @IsString()
  uploadSessionId?: string;
  @IsEnum(ContentType, { message: 'Loại nội dung phải là post|story' })
  type: ContentType;
}
