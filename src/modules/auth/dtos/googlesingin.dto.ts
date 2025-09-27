import { IsNotEmpty, IsString } from 'class-validator';

export class GoogleSignInDTO {
  @IsString({ message: 'Mã xác minh Google phải là chuỗi' })
  @IsNotEmpty({ message: 'Mã xác minh Google không được để trống' })
  googleCode: string;
}
