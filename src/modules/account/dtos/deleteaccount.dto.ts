import { IsString, Length } from 'class-validator';

export class DeleteAccountDTO {
  @IsString({ message: 'Mã xác minh phải là chuỗi ký tự' })
  @Length(6, 6, { message: 'Mã xác minh phải đúng 6 ký tự' })
  verificationCode: string;
}
