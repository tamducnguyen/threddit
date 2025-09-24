import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';

export class VerifyAccountDTO {
  @IsString({ message: 'Mã xác minh phải là chuỗi ký tự' })
  @Length(6, 6, { message: 'Mã xác minh phải đúng 6 ký tự' })
  verificationCode: string;

  @IsEmail({}, { message: 'Email không hợp lệ.' })
  @IsNotEmpty({ message: 'Email không được để trống.' })
  email: string;
}
