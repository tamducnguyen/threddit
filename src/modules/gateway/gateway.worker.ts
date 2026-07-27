import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Server } from 'socket.io';
import { chatRoom } from '../../common/helper/chat.helper';
import { sendWsResponse } from '../../common/helper/response.helper';
import {
  JobGatewayQueue,
  NameGatewayQueue,
  JoinMembersJobData,
  LeaveMembersJobData,
  BroadcastJobData,
} from './helper/gateway-queue.helper';

/**
 * Processes queued websocket side-effects (room join/leave, broadcasts) off
 * the request path. `GatewayService` only enqueues jobs; this worker is the
 * sole place that touches the live Socket.IO server for those effects.
 */
@Processor(NameGatewayQueue, {
  concurrency: parseInt(process.env.GATEWAY_CONCURRENCY || '5', 10),
})
export class GatewayWorker extends WorkerHost {
  private server: Server | null = null;

  /** Handed by the gateway in `afterInit` so queued jobs can reach live sockets. */
  setServer(server: Server) {
    this.server = server;
  }

  async process(job: Job) {
    if (!this.server) return;

    switch (job.name) {
      case String(JobGatewayQueue.JOIN_MEMBERS): {
        const data = job.data as JoinMembersJobData;
        if (data.memberIds.length > 0) {
          const room = chatRoom.conversation(data.conversationId);
          const sockets = await this.server
            .in(data.memberIds.map((memberId) => chatRoom.user(memberId)))
            .fetchSockets();
          for (const socket of sockets) {
            socket.join(room);
          }
        }
        // Broadcast only after the join above completes, so members pulled
        // into the room this job just joined never miss it.
        this.emitBroadcast(data.conversationId, data.broadcast);
        break;
      }
      case String(JobGatewayQueue.LEAVE_MEMBERS): {
        const data = job.data as LeaveMembersJobData;
        if (data.memberIds.length > 0) {
          const room = chatRoom.conversation(data.conversationId);
          const sockets = await this.server
            .in(data.memberIds.map((memberId) => chatRoom.user(memberId)))
            .fetchSockets();
          for (const socket of sockets) {
            socket.leave(room);
          }
        }
        this.emitBroadcast(data.conversationId, data.broadcast);
        break;
      }
      case String(JobGatewayQueue.BROADCAST): {
        const data = job.data as BroadcastJobData;
        this.emitBroadcast(data.conversationId, data);
        break;
      }
      default: {
        console.log(`Job ${job.id} Not match any job cases`);
      }
    }
  }

  private emitBroadcast(
    conversationId: number,
    broadcast?: Omit<BroadcastJobData, 'conversationId'>,
  ) {
    if (!broadcast || !this.server) return;
    this.server
      .to(chatRoom.conversation(conversationId))
      .emit(broadcast.event, sendWsResponse(broadcast.message, broadcast.data));
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    console.log(`Job ${job.id} completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, err: Error) {
    console.error(`Job ${job.id} failed:`, err.message);
  }
}
