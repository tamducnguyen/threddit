import { IsNotEmpty, IsString } from 'class-validator';

export class SearchUserDTO {
  @IsString({ message: 'Từ khóa phải là một chuỗi' })
  @IsNotEmpty({ message: 'Từ khóa không được rỗng' })
  key: string;
}
