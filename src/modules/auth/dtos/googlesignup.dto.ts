import { IsNotEmpty, IsString, Length } from 'class-validator';

export class GoogleSignUpDTO {
  @IsString({ message: 'Tên người dùng phải là chuỗi' })
  @IsNotEmpty({ message: 'Tên người dùng không được để trống' })
  @Length(8, 32, { message: 'Tên người dùng phải từ 8 đến 32 ký tự' })
  username: string;
  @IsString({ message: 'Mã xác minh Google phải là chuỗi' })
  @IsNotEmpty({ message: 'Mã xác minh Google không được để trống' })
  googleCode: string;
}
