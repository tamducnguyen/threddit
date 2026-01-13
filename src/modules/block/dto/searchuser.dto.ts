import { IsOptional, IsString } from 'class-validator';

export class SearchUserOptionalDTO {
  @IsOptional()
  @IsString({ message: 'Từ khóa phải là chuỗi' })
  key?: string;
}
