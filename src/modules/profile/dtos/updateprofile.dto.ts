import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';
import { EducationalLevel } from 'src/modules/enum/educationallevel.enum';
import { Gender } from 'src/modules/enum/gender.enum';
import { RelationshipStatus } from 'src/modules/enum/relationshipstatus.enum';

export class UpdateProfileDTO {
  @ValidateIf((_, value) => value !== undefined)
  @IsString({ message: 'Tên hiển thị phải là chuỗi' })
  @IsNotEmpty({ message: 'Tên hiển thị không được để trống' })
  displayName: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsEnum(Gender, {
    message:
      'Giới tính không hợp lệ, phải là male|female|other|null (null là xóa thông tin)',
  })
  gender?: Gender | null;

  @IsOptional()
  @Type(() => Date)
  @ValidateIf((_, value) => value !== null)
  @IsDate({ message: 'Ngày sinh không hợp lệ (null là xóa thông tin)' })
  dateOfBirth?: Date | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsEnum(EducationalLevel, {
    message:
      'Trình đố học vấn phải là high_school, college, bachelor, master, doctorate, null (null là xóa thông tin)',
  })
  educationalLevel?: EducationalLevel | null;
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsEnum(RelationshipStatus, {
    message:
      'Trạng thái mối quan hệ phải là single, dating, in_relationship, engage, married, null (null là xóa thông tin)',
  })
  relationshipStatus?: RelationshipStatus | null;
}
