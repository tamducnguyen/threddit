import { ArrayMaxSize, IsArray, IsInt, IsOptional, Min } from 'class-validator';

export class GetPresenceDTO {
  // Optional explicit set of users to look up. When omitted, the gateway falls
  // back to everyone the requester shares a conversation with.
  @IsOptional()
  @IsArray({ message: 'userIds phải là một mảng' })
  @ArrayMaxSize(500, { message: 'userIds tối đa 500 phần tử' })
  @IsInt({ each: true, message: 'Mỗi userId phải là số nguyên' })
  @Min(1, { each: true, message: 'userId không hợp lệ' })
  userIds?: number[];
}
