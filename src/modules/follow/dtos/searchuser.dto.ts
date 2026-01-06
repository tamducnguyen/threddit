import { IsOptional, IsString } from 'class-validator';

export class SearchUserOptionalDTO {
  @IsOptional()
  @IsString({ message: 'Từ khóa là một chuỗi' })
  key?: string;
}
