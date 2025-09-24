import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { sendResponse } from '../helper/response.helper';
import { message } from '../helper/message.helper';

@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  protected getTracker(req: Record<string, any>): Promise<string> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (req.user?.sub) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
      return req.user.sub;
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return req.ip;
  }
  protected throwThrottlingException(): Promise<void> {
    throw new HttpException(
      sendResponse(
        HttpStatus.TOO_MANY_REQUESTS,
        message.common.too_many_requests,
      ),
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
