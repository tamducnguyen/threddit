import { IsNotEmpty, IsString } from 'class-validator';

export class GoogleCodeDTO {
  @IsString({ message: 'Google code phải là chuỗi' })
  @IsNotEmpty({ message: 'Google code không được để trống' })
  googleCode: string;
}
