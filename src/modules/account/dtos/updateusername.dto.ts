import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class UpdateUsernameDTO {
  @IsString({ message: 'Tên người dùng phải là chuỗi' })
  @IsNotEmpty({ message: 'Tên người dùng không được để trống' })
  @Matches(/^\S+$/, { message: 'Tên người dùng không được chứa dấu cách' })
  username: string;
}
