import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class ContentIdDTO {
  @Type(() => Number)
  @IsInt({ message: 'ID bài viết phải là số nguyên' })
  @Min(1, { message: 'ID bài viết phải lớn hơn hoặc bằng 1' })
  contentId: number;
}
