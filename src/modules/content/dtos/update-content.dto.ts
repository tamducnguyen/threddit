import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  Validate,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'IsSequentialSortOrder', async: false })
export class IsSequentialSortOrder implements ValidatorConstraintInterface {
  validate(mediaFiles: MediaFile[]) {
    if (!Array.isArray(mediaFiles) || mediaFiles.length === 0) return true;

    const sortOrders = mediaFiles.map((m) => m.sortOrder);

    // unique
    const unique = new Set(sortOrders);
    if (unique.size !== sortOrders.length) return false;

    // sort
    const sorted = [...sortOrders].sort((a, b) => a - b);

    // phải bắt đầu từ 1 và liên tiếp
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i] !== i + 1) return false;
    }

    return true;
  }

  defaultMessage() {
    return 'sortOrder phải unique và bắt đầu từ 1 liên tiếp nhau (1,2,3...)';
  }
}
export class MediaFile {
  @IsString({ message: 'mediaKey phải là chuỗi' })
  @IsNotEmpty({ message: 'mediaKey không được rỗng' })
  mediaKey: string;

  @IsInt({ message: 'sortOrder phải là số nguyên' })
  @Min(1, { message: 'sortOrder phải >= 1' })
  sortOrder: number;
}

export class UpdateContentDTO {
  @IsOptional()
  @IsString({ message: 'Nội dung bài viết phải là chuỗi' })
  text?: string;

  @IsOptional()
  @IsArray({ message: 'Danh sách người dùng được đề cập phải là một mảng' })
  @ArrayMaxSize(10, { message: 'Giới hạn đề cập là 10 người dùng' })
  @ArrayUnique({ message: 'Mỗi username chỉ được xuất hiện một lần' })
  @IsString({ each: true, message: 'Username đề cập phải là chuỗi' })
  mentionedUsers?: string[];

  @IsOptional()
  @IsArray({
    message: `Danh sách mediaFiles phải là một mảng 
            {
              mediaKey: string;
              sortOrder: number;
            }`,
  })
  @ArrayUnique((o: MediaFile) => o.mediaKey, {
    message: 'Media key không được trùng lặp',
  })
  @ValidateNested({ each: true })
  @Type(() => MediaFile)
  @Validate(IsSequentialSortOrder)
  mediaFiles?: MediaFile[];

  @IsOptional()
  @IsString({ message: 'uploadSessionId phải là chuỗi' })
  uploadSessionId?: string;
}
