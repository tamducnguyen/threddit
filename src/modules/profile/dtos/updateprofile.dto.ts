import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { Gender } from 'src/modules/enum/gender.enum';

export class UpdateProfileDTO {
  @IsOptional()
  @IsString({ message: 'Tên hiển thị phải là chuỗi' })
  @IsNotEmpty({ message: 'Tên hiển thị không được để trống' })
  displayName: string;

  @IsOptional()
  @IsEnum(Gender, {
    message: 'Giới tính không hợp lệ, phải là male|female|other',
  })
  @IsNotEmpty({ message: 'Giới tính không được để trống' })
  gender: Gender;

  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'Ngày sinh không hợp lệ' })
  @IsNotEmpty({ message: 'Ngày sinh không được để trống' })
  dateOfBirth: Date;
}
