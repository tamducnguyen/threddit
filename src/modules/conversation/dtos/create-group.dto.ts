import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateGroupDTO {
  @IsOptional()
  @IsString({ message: 'Tên nhóm phải là chuỗi' })
  @MaxLength(100, { message: 'Tên nhóm không được vượt quá 100 ký tự' })
  name?: string;

  // Usernames to seed the group with, besides the creator (who becomes ADMIN).
  @IsArray({ message: 'Danh sách thành viên phải là một mảng' })
  @ArrayMinSize(1, { message: 'Nhóm phải có ít nhất một thành viên' })
  @ArrayMaxSize(200, { message: 'Nhóm tối đa 200 thành viên' })
  @IsString({ each: true, message: 'Tên người dùng phải là chuỗi' })
  @Matches(/^(?=.{1,30}$)(?![_.])[a-z0-9]+(?:[._][a-z0-9]+)*$/, {
    each: true,
    message: 'Tên người dùng không hợp lệ',
  })
  memberUsernames: string[];
}
