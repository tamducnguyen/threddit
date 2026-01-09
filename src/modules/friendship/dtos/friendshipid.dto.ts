import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class FriendshipIdDTO {
  @Type(() => Number)
  @IsInt({ message: 'friendshipId phải là số nguyên' })
  @Min(1, { message: 'friendshipId phải lớn hơn hoặc bằng 1' })
  friendshipId: number;
}
