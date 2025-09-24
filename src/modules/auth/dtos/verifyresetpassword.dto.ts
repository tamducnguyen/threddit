import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsStrongPassword,
  Length,
} from 'class-validator';

export class VerifyResetPasswordDTO {
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @IsNotEmpty({ message: 'Email không được để trống.' })
  email: string;

  @IsString({ message: 'Mã xác minh phải là chuỗi ký tự' })
  @Length(6, 6, { message: 'Mã xác minh phải đúng 6 ký tự' })
  verificationCode: string;

  @IsStrongPassword(
    {},
    {
      message:
        'Mật khẩu phải bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt, tối thiểu 8 ký tự',
    },
  )
  newPassword: string;

  @IsString({ message: 'Mật khẩu phải là chuỗi ký tự.' })
  @IsNotEmpty({ message: 'Mật khẩu không được để trống.' })
  confirmedNewPassword: string;
}
