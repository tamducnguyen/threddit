import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsStrongPassword,
  Length,
} from 'class-validator';

export class SignUpDTO {
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @IsNotEmpty({ message: 'Email không được rỗng' })
  email: string;

  @IsString({ message: 'Tên người dùng phải là chuỗi' })
  @IsNotEmpty({ message: 'Tên người dùng không được để trống' })
  @Length(8, 32, { message: 'Tên người dùng phải từ 8 đến 32 ký tự' })
  username: string;

  @IsStrongPassword(
    {},
    {
      message:
        'Mật khẩu phải bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt, tối thiểu 8 ký tự',
    },
  )
  password: string;

  @IsString({ message: 'Xác nhận mật khẩu phải là chuỗi' })
  @IsNotEmpty({ message: 'Xác nhận mật khẩu không được để trống' })
  confirmedPassword: string;
}
