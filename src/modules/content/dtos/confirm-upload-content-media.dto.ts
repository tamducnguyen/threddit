import { ArrayNotEmpty, ArrayUnique, IsArray, IsString } from 'class-validator';

export class ConfirmUploadContentMediaDTO {
  @IsArray({ message: 'Danh sách media key phải là một mảng' })
  @ArrayNotEmpty({ message: 'Danh sách media key không được rỗng' })
  @ArrayUnique({ message: 'Media key không được trùng lặp' })
  @IsString({ each: true, message: 'Mỗi media key phải là một chuỗi' })
  mediaKeys: string[];
}
