import { IsOptional, IsString } from 'class-validator';

export class SearchUserOptionalDTO {
  @IsOptional()
  @IsString({ message: 'Key phải là một chuỗi' })
  key?: string;
}
