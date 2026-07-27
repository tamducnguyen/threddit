import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class AddMemberDTO {
  @IsString({ message: 'Tên người dùng phải là chuỗi' })
  @IsNotEmpty({ message: 'Tên người dùng không được để trống' })
  @Matches(/^(?=.{1,30}$)(?![_.])[a-z0-9]+(?:[._][a-z0-9]+)*$/, {
    message: 'Tên người dùng không hợp lệ',
  })
  username: string;
}
