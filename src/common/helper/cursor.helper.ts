import { JwtService } from '@nestjs/jwt';
import { ServiceExceptionClass } from '../exception/base-service.exception';

/**
 * Decode a signed cursor token; `undefined` passes through (first page). Any
 * verify/validate failure normalizes to one `cursor_invalid` error, thrown as
 * the given `BaseServiceException` subclass — same pattern as
 * `ContentService`'s own `decodeCursor`.
 *
 * Shared by the conversation inbox and message history pagination.
 */
export async function decodeCursor<T extends object>(
  jwtService: JwtService,
  cursor: string | undefined,
  CursorInvalidException: ServiceExceptionClass,
  validate?: (payload: T) => boolean,
): Promise<T | undefined> {
  if (!cursor) return undefined;
  try {
    const payload = await jwtService.verifyAsync<T>(cursor);
    if (validate && !validate(payload)) {
      throw new Error('invalid cursor payload');
    }
    return payload;
  } catch {
    throw new CursorInvalidException();
  }
}
