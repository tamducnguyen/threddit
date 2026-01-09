import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CursorDTO {
  @IsOptional()
  @IsString({ message: 'Con trỏ phải là mục chuỗi' })
  @IsNotEmpty({ message: 'Con trỏ không được để rỗng' })
  cursor: string;
}
