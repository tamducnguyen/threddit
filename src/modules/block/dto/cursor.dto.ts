import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CursorDTO {
  @IsOptional()
  @IsString({ message: 'Con trỏ phải là chuỗi' })
  @IsNotEmpty({ message: 'Con trỏ không được rỗng' })
  cursor: string;
}
