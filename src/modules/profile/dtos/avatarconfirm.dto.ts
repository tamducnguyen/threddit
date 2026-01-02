import { IsNotEmpty, IsString } from 'class-validator';

export class AvatarConfirmDTO {
  @IsString({ message: 'Key phải là chuỗi' })
  @IsNotEmpty({ message: 'Key không được để trống' })
  key: string;
}
