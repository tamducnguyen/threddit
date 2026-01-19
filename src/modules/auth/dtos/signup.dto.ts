import { Type } from 'class-transformer';
import {
  IsDate,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  IsStrongPassword,
  Matches,
} from 'class-validator';
import { Gender } from 'src/modules/enum/gender.enum';

export class SignUpDTO {
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @IsNotEmpty({ message: 'Email không được rỗng' })
  email: string;

  @IsString({ message: 'Tên người dùng phải là chuỗi' })
  @IsNotEmpty({ message: 'Tên người dùng không được để trống' })
  @Matches(/^(?=.{1,30}$)(?![_.])[a-z0-9]+(?:[._][a-z0-9]+)*$/, {
    message:
      'username chỉ cho phép a-z, 0-9, "." và "_"; không dấu; không khoảng trắng; không bắt đầu/kết thúc bằng "." hoặc "_"; không có ký tự đặc biệt liên tiếp; độ dài 1–30',
  })
  username: string;

  @IsString({ message: 'Tên hiển thị phải là chuỗi' })
  @IsNotEmpty({ message: 'Tên hiển thị không được để trống' })
  displayName: string;

  @IsEnum(Gender, { message: 'Giới tính không hợp lệ' })
  @IsNotEmpty({ message: 'Giới tính không được để trống' })
  gender: Gender;

  @Type(() => Date)
  @IsDate({ message: 'Ngày sinh không hợp lệ' })
  @IsNotEmpty({ message: 'Ngày sinh không được để trống' })
  dateOfBirth: Date;

  @IsStrongPassword(
    {},
    {
      message:
        'Mật khẩu phải bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt, tối thiểu 8 ký tự',
    },
  )
  password: string;

  @IsString({ message: 'Xác nhận mật khẩu phải là chuỗi' })
  @IsNotEmpty({ message: 'Xác nhận mật khẩu không được để trống' })
  confirmedPassword: string;
}
