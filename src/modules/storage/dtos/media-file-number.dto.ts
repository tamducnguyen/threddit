import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class MediaFileNumberDTO {
  @Type(() => Number)
  @IsInt({ message: 'mediaFileNumber must be an integer' })
  @Min(1, { message: 'mediaFileNumber must be greater than or equal to 1' })
  mediaFileNumber: number;
}
