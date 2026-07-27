import { IsOptional, IsString } from 'class-validator';
import { CursorDTO } from './cursor.dto';

/**
 * Combines the optional search `key` and pagination `cursor` in one class.
 * Nest hands the *entire* raw query object to every `@Query()` parameter on
 * a handler — it doesn't split fields between them — so pairing `CursorDTO`
 * with a separate single-field search DTO on the same route makes each one
 * see the other's field too, and `whitelist + forbidNonWhitelisted` (see
 * main.ts) rejects it as an unknown property. Extends `CursorDTO` so
 * `cursor`'s validation stays defined in one place; adds `key` on top. Use
 * this single combined DTO on any route that accepts both.
 */
export class SearchUserWithCursorDTO extends CursorDTO {
  @IsOptional()
  @IsString({ message: 'Từ khóa là một chuỗi' })
  key?: string;
}
