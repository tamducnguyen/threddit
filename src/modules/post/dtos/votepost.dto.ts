import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, Min } from 'class-validator';

export class VotePostDTO {
  @Type(() => Number)
  @IsInt({ message: 'postId phải là số nguyên.' })
  @Min(1, { message: 'postId phải lớn hơn hoặc bằng 1.' })
  postId: number;
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
  })
  @IsBoolean({ message: 'isUpvote phải là true hoặc false.' })
  isUpvote: boolean;
}
