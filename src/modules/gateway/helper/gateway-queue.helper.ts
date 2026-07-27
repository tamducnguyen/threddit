export enum JobGatewayQueue {
  JOIN_MEMBERS = 'joinMembersToRoom',
  LEAVE_MEMBERS = 'leaveMembersFromRoom',
  BROADCAST = 'broadcastToConversation',
}

export const NameGatewayQueue = 'gateway';

export interface BroadcastJobData {
  conversationId: number;
  event: string;
  message: string;
  data: unknown;
}

export interface JoinMembersJobData {
  memberIds: number[];
  conversationId: number;
  /**
   * Emitted after the join completes, within the same job, so a member added
   * to a room can never receive a broadcast about it before joining (two
   * separate jobs on a concurrent worker give no such ordering guarantee).
   */
  broadcast?: Omit<BroadcastJobData, 'conversationId'>;
}

export interface LeaveMembersJobData {
  memberIds: number[];
  conversationId: number;
  /** See `JoinMembersJobData.broadcast`. */
  broadcast?: Omit<BroadcastJobData, 'conversationId'>;
}
