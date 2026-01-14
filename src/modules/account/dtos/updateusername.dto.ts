import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class UpdateUsernameDTO {
  @IsString({ message: 'Tên người dùng phải là chuỗi' })
  @IsNotEmpty({ message: 'Tên người dùng không được để trống' })
  @Matches(/^(?=.{1,30}$)(?![_.])[a-z0-9]+(?:[._][a-z0-9]+)*$/, {
    message:
      'username chỉ cho phép a-z, 0-9, "." và "_"; không dấu; không khoảng trắng; không bắt đầu/kết thúc bằng "." hoặc "_"; không có ký tự đặc biệt liên tiếp; độ dài 1–30',
  })
  username: string;
}
