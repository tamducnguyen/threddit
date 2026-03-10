import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class CommentIdDTO {
  @Type(() => Number)
  @IsInt({ message: 'commentId phải là số nguyên' })
  @Min(1, { message: 'commentId phải lớn hơn hoặc bằng 1' })
  commentId: number;
}
