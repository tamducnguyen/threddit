import { ThrottlerGuard, ThrottlerRequest } from '@nestjs/throttler';
import { Socket } from 'socket.io';
import { ChatRateLimitException } from '../exception';
export class WsThrottlerGuard extends ThrottlerGuard {
  protected throwThrottlingException(): Promise<void> {
    throw new ChatRateLimitException();
  }
  protected async handleRequest(
    requestProps: ThrottlerRequest,
  ): Promise<boolean> {
    const { context, limit, ttl, throttler, blockDuration, generateKey } =
      requestProps;

    const client = context.switchToWs().getClient<Socket>();
    const tracker = client.conn.remoteAddress;
    const key = generateKey(
      context,
      tracker,
      throttler.name ?? 'wsThrottleName',
    );
    const { isBlocked } = await this.storageService.increment(
      key,
      ttl,
      limit,
      blockDuration,
      throttler.name ?? 'wsThrottleName',
    );

    // Throw an error when the user reached their limit.
    if (isBlocked) {
      await this.throwThrottlingException();
    }

    return true;
  }
}
