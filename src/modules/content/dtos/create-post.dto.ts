import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { ALLOWED_MEDIA_CONTENT_TYPES } from '../../storage/helper/media-content-types.constant';

export class CreatePostDTO {
  @IsString()
  @IsOptional()
  text: string;
  @IsOptional()
  @IsArray({ message: 'Danh sách bạn bè được đề cập là một array' })
  @ArrayMaxSize(10, { message: 'Giới hạn đề cập là 10 bạn bè' })
  @ArrayUnique({ message: 'Mỗi tên người dùng là duy nhất trong danh sách' })
  @IsString({ each: true, message: 'Username phải là một chuỗi' })
  mentionedUsers?: string[];
  @IsBoolean({ message: 'Trạng thái tệp đính kèm phải là kiểu boolean' })
  isHadMediaFiles: boolean;
  @IsNumber()
  @IsOptional()
  mediaFilesNumber: number;
  @IsArray({ message: 'Danh sách media content type phải là một array' })
  @IsString({
    each: true,
    message: 'Mỗi media content type phải là một chuỗi',
  })
  @IsIn(ALLOWED_MEDIA_CONTENT_TYPES, {
    each: true,
    message: 'Media content type không hợp lệ',
  })
  @IsOptional()
  mediaContentTypes?: string[];
}
