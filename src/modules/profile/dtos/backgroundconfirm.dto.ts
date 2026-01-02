import { IsNotEmpty, IsString } from 'class-validator';

export class BackgroundConfirmDTO {
  @IsString({ message: 'Key phải là chuỗi' })
  @IsNotEmpty({ message: 'Key không được để trống' })
  key: string;
}
