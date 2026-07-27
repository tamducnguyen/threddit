import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  JobGatewayQueue,
  NameGatewayQueue,
} from './helper/gateway-queue.helper';

/**
 * Thin queueing facade over the gateway's websocket side-effects. Other
 * modules (e.g. `ConversationService`) call these instead of touching
 * BullMQ or Socket.IO directly; `GatewayWorker` does the actual socket work
 * asynchronously, off the request path.
 */
@Injectable()
export class GatewayService {
  constructor(
    @InjectQueue(NameGatewayQueue) private readonly gatewayQueue: Queue,
  ) {}

  /**
   * Pull the given users' live sockets into a conversation room (best-effort).
   * Pass `broadcast` to emit it in the same job, right after the join
   * completes — enqueueing the broadcast separately gives no guarantee it
   * won't be processed (and delivered) before the join finishes.
   */
  async joinMembersToRoom(
    memberIds: number[],
    conversationId: number,
    broadcast?: { event: string; message: string; data: unknown },
  ) {
    if (memberIds.length === 0 && !broadcast) return;
    await this.enqueue(JobGatewayQueue.JOIN_MEMBERS, {
      memberIds,
      conversationId,
      broadcast,
    });
  }

  /**
   * Remove the given users' live sockets from a conversation room (best-effort).
   * See `joinMembersToRoom` for why `broadcast` is passed through instead of
   * enqueued separately.
   */
  async leaveMembersFromRoom(
    memberIds: number[],
    conversationId: number,
    broadcast?: { event: string; message: string; data: unknown },
  ) {
    if (memberIds.length === 0 && !broadcast) return;
    await this.enqueue(JobGatewayQueue.LEAVE_MEMBERS, {
      memberIds,
      conversationId,
      broadcast,
    });
  }

  /** Emit an event to every socket in a conversation room (best-effort). */
  async broadcastToConversation(
    conversationId: number,
    event: string,
    msg: string,
    data: unknown,
  ) {
    await this.enqueue(JobGatewayQueue.BROADCAST, {
      conversationId,
      event,
      message: msg,
      data,
    });
  }

  /** Enqueue a gateway websocket job, logging (not throwing) on failure. */
  private async enqueue(
    jobName: JobGatewayQueue,
    data: Record<string, unknown>,
  ) {
    try {
      await this.gatewayQueue.add(jobName, data);
    } catch (error) {
      console.error(
        `Failed to enqueue gateway job ${jobName}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
