import { IsNotEmpty, IsString, IsStrongPassword } from 'class-validator';

export class UpdatePasswordDTO {
  @IsString({ message: 'Mật khẩu phải là chuỗi' })
  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
  oldPassword: string;

  @IsStrongPassword(
    {},
    {
      message:
        'Mật khẩu mới phải bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt, tối thiểu 8 ký tự',
    },
  )
  @IsNotEmpty({ message: 'Mật khẩu mới không được để trống' })
  newPassword: string;

  @IsString({ message: 'Xác nhận mật khẩu phải là chuỗi' })
  @IsNotEmpty({ message: 'Xác nhận mật khẩu không được để trống' })
  confirmedNewPassword: string;
}
