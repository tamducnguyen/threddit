import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * Carries both `key` and `cursor` in one class. Nest hands the *entire* raw
 * query object to every `@Query()` parameter on a handler — it doesn't split
 * fields between them — so pairing this with a separate `CursorDTO` param
 * would make each DTO see the other's field too, and
 * `whitelist + forbidNonWhitelisted` (see main.ts) rejects it as unknown.
 */
export class SearchConversationDTO {
  @IsString({ message: 'Từ khóa là một chuỗi' })
  @IsNotEmpty({ message: 'Từ khóa không được để rỗng' })
  key: string;

  @IsOptional()
  @IsString({ message: 'Con trỏ phải là mục chuỗi' })
  @IsNotEmpty({ message: 'Con trỏ không được để rỗng' })
  cursor?: string;
}
