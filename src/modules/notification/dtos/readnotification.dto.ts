import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class ReadNotificationDTO {
  @Type(() => Number)
  @IsInt({ message: 'notificationId phải là số nguyên.' })
  @Min(1, { message: 'notificationId phải lớn hơn hoặc bằng 1.' })
  notificationId: number;
}
