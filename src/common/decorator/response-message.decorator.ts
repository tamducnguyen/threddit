import { SetMetadata } from '@nestjs/common';

export const RESPONSE_MESSAGE = 'response_message';

export const ResponseMessage = (message: string | Record<string, string>) =>
  SetMetadata(
    RESPONSE_MESSAGE,
    typeof message === 'string' ? { success: message } : message,
  );
