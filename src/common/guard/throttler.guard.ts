import { Injectable } from '@nestjs/common';
import { CommonTooManyRequestsException } from '../exception';
import { ThrottlerGuard } from '@nestjs/throttler';

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
    throw new CommonTooManyRequestsException();
  }
}
