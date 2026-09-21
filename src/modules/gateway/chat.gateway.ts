import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { parse as parseCookie } from 'cookie';
import { UserEntity } from '../../entities/user.entity';
import { SessionService } from '../token/session.service';
import { cookieOptions } from '../../common/helper/cookie.helper';
import { chatEvent, chatRoom } from '../../common/helper/chat.helper';
import { sendWsResponse } from '../../common/helper/response.helper';
import { message } from '../../common/helper/message.helper';
import { SendMessageDTO } from '../message/dtos/send-message.dto';
import { GetPresenceDTO } from './dtos/get-presence.dto';
import { RevokeMessageDTO } from '../message/dtos/revoke-message.dto';
import { EditMessageDTO } from '../message/dtos/edit-message.dto';
import { PinMessageDTO } from '../message/dtos/pin-message.dto';
import { ReactMessageDTO } from '../message/dtos/react-message.dto';
import { UnreactMessageDTO } from '../message/dtos/unreact-message.dto';
import { TypingDTO } from './dtos/typing.dto';
import { MessageService } from '../message/message.service';
import { ConversationService } from '../conversation/conversation.service';
import { GatewayService } from './gateway.service';
import { GatewayWorker } from './gateway.worker';
import { PresenceService } from './presence.service';
import { ChatRateLimiterService } from './chat-rate-limiter.service';
import { ChatSocketData } from './interfaces/socket-data.interface';
import { ConfigService } from '@nestjs/config';
import {
  ChatSendMessageRateLimitedException,
  ChatTypingRateLimitedException,
} from '../../common/exception';
import { Logger, UseFilters, UsePipes } from '@nestjs/common';
import { WsServiceExceptionFilter } from 'src/common/filter/ws-service-exception.filter';
import { WsValidation } from 'src/common/pipe/ws-validation.pipe';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_DOMAIN,
    credentials: true,
  },
})
@UseFilters(WsServiceExceptionFilter)
@UsePipes(WsValidation)
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly sendMessageRateLimit: number;
  private readonly sendMessageRateWindowMs: number;
  private readonly typingRateLimit: number;
  private readonly typingRateWindowMs: number;
  private readonly logger: Logger;
  constructor(
    private readonly sessionService: SessionService,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly messageService: MessageService,
    private readonly conversationService: ConversationService,
    private readonly gatewayService: GatewayService,
    private readonly presenceService: PresenceService,
    private readonly gatewayWorker: GatewayWorker,
    private readonly chatRateLimiterService: ChatRateLimiterService,
    configService: ConfigService,
  ) {
    this.sendMessageRateLimit = configService.getOrThrow(
      'CHAT_SEND_MESSAGE_RATE_LIMIT',
    );
    this.sendMessageRateWindowMs = configService.getOrThrow(
      'CHAT_SEND_MESSAGE_RATE_WINDOW_MS',
    );
    this.typingRateLimit = configService.getOrThrow('CHAT_TYPING_RATE_LIMIT');
    this.typingRateWindowMs = configService.getOrThrow(
      'CHAT_TYPING_RATE_WINDOW_MS',
    );
    this.logger = new Logger(ChatGateway.name);
  }

  /**
   * When client start to connect, they must be authenticated, their token must be valid and they must be exist
   * @param server - websocket server
   */
  afterInit(server: Server) {
    this.gatewayWorker.setServer(server);
    server.use((socket: Socket, next) => {
      this.authenticate(socket)
        .then(() => next())
        .catch((error: Error) => next(error));
    });
  }

  /**
   * Extract the auth token from the Authorization header, falling back to the auth cookie.
   * @param client - The socket whose handshake is inspected.
   * @returns The auth token, or null when none is present.
   */
  private extractToken(client: Socket): string | null {
    // Prefer the bearer token from the Authorization header.
    const authHeader = client.handshake.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7);

    // Fall back to the auth cookie sent during the handshake.
    const cookieHeader = client.handshake.headers.cookie;
    if (cookieHeader) {
      const cookies: Record<string, string | undefined> =
        parseCookie(cookieHeader);
      const token = cookies[cookieOptions.name.THREDDIT_AUTH];
      if (token) return token;
    }
    return null;
  }

  /**
   * Resolve the connecting socket's user from its auth token and attach user information to
   * socket.data to use in other events. Throws to reject the connection (surfaced to the client as
   * `connect_error`) when the token is missing/invalid or the user no longer exists.
   * @param socket - The connecting socket, pre-accept.
   */
  private async authenticate(socket: Socket): Promise<void> {
    const token = this.extractToken(socket);
    if (!token) {
      throw new Error(message.chat.connection.token_missing);
    }

    // Validate the session (cache first, DB fallback) to get the user id.
    const payload = await this.sessionService.validateSession(token);

    // Resolve the username once at connection time for typing broadcasts. /////////////////////////////
    const userFound = await this.userRepository.findOne({
      where: { id: payload.sub },
      select: { id: true, username: true, displayName: true },
    });
    if (!userFound) {
      throw new Error(message.common.user_not_found);
    }

    const data = socket.data as ChatSocketData;
    data.user = {
      sub: payload.sub,
      username: userFound.username,
      displayName: userFound.displayName,
    };
  }

  /**
   * Join the now-authenticated socket to its rooms and announce presence.
   * `client.data.user` is guaranteed set by the `authenticate` middleware by
   * the time this runs.
   * @param client - The connecting socket.
   */
  async handleConnection(client: Socket) {
    try {
      const { user } = client.data as ChatSocketData;

      // Join the user's personal room for targeted emits.
      await client.join(chatRoom.user(user.sub));

      // Auto-join every conversation room the user belongs to so subsequent
      // messages can be broadcast room-wise without per-member fan-out.
      const conversationIds =
        await this.conversationService.findConversationIdsOfUser(user.sub);
      (client.data as ChatSocketData).conversationIds = conversationIds;
      if (conversationIds.length > 0) {
        await client.join(
          conversationIds.map((conversationId) =>
            chatRoom.conversation(conversationId),
          ),
        );
      }

      // Register the connection and, when this is the user's first socket,
      // announce that they came online to everyone sharing a conversation with
      // them (excluding this socket via `broadcast`).
      const becameOnline = await this.presenceService.addConnection(user.sub);
      if (becameOnline && conversationIds.length > 0) {
        client.broadcast
          .to(
            conversationIds.map((conversationId) =>
              chatRoom.conversation(conversationId),
            ),
          )
          .emit(
            chatEvent.PRESENCE_ONLINE,
            sendWsResponse(true, message.chat.presence.online, {
              userId: user.sub,
            }),
          );
      }

      // Keep the connection counter alive while the socket lives. Socket.IO's
      // transport emits `heartbeat` on each ping/pong (~pingInterval), well
      // within the counter's TTL, so the counter only lapses if the server
      // crashes — letting Redis reclaim it instead of pinning the user online.
      client.conn.on('heartbeat', () => {
        void this.presenceService.refreshConnection(user.sub);
      });
    } catch (error) {
      this.logger.log(error);
      client.disconnect(true);
    }
  }

  /**
   * Deregister the socket and, when it was the user's last connection,
   * announce that they went offline to everyone sharing a conversation with
   * them. Uses the conversation ids captured at connection time, since the
   * socket is already leaving its rooms by now.
   * @param client - The disconnecting socket.
   */
  async handleDisconnect(client: Socket) {
    const { user, conversationIds } = client.data as Partial<ChatSocketData>;
    // Sockets rejected during connection never got a user attached.
    if (!user) {
      return;
    }

    const { becameOffline, lastSeen } =
      await this.presenceService.removeConnection(user.sub);
    if (becameOffline && conversationIds && conversationIds.length > 0) {
      this.server
        .to(
          conversationIds.map((conversationId) =>
            chatRoom.conversation(conversationId),
          ),
        )
        .emit(
          chatEvent.PRESENCE_OFFLINE,
          sendWsResponse(true, message.chat.presence.offline, {
            userId: user.sub,
            lastSeen,
          }),
        );
    }
  }

  /**
   * Reply to the requesting socket with the current presence of a set of
   * users. When no ids are supplied, defaults to everyone the requester shares
   * a conversation with. Needed because a client that connects late misses the
   * live PRESENCE_ONLINE/PRESENCE_OFFLINE transitions.
   *
   * @param client - The authenticated socket requesting the snapshot.
   * @param getPresenceDTO - Optional explicit set of user ids to look up.
   */
  @SubscribeMessage(chatEvent.GET_PRESENCE)
  async handleGetPresence(
    @ConnectedSocket() client: Socket,
    @MessageBody() getPresenceDTO: GetPresenceDTO,
  ) {
    const { user } = client.data as ChatSocketData;
    const userIds =
      getPresenceDTO.userIds && getPresenceDTO.userIds.length > 0
        ? getPresenceDTO.userIds
        : await this.conversationService.findChatPartnerIds(user.sub);

    const presence = await this.presenceService.getPresence(userIds);

    client.emit(
      chatEvent.PRESENCE_SNAPSHOT,
      sendWsResponse(true, message.chat.presence.snapshot, presence),
    );
  }

  /**
   * Handle an inbound message from a client and broadcast the persisted
   * message to every member of the conversation.
   *
   * @param client - The authenticated socket sending the message.
   * @param sendMessageDTO - The message payload.
   */
  @SubscribeMessage(chatEvent.SEND_MESSAGE)
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() sendMessageDTO: SendMessageDTO,
  ) {
    const { user } = client.data as ChatSocketData;
    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    const allowed = await this.chatRateLimiterService.checkLimit(
      chatEvent.SEND_MESSAGE,
      user.sub,
      this.sendMessageRateLimit,
      this.sendMessageRateWindowMs,
    );
    ///////////////////////////////////////////////////////////////////////////////
    if (!allowed) {
      throw new ChatSendMessageRateLimitedException();
    }
    ///////////////////////////////////////////////////////////////////////////////////////////////////////
    const { sentMessage, memberIds, isNewConversation } =
      await this.messageService.sendMessage(user.sub, sendMessageDTO);

    const broadcast = {
      event: chatEvent.NEW_MESSAGE,
      message: message.chat.send_message.success,
      data: sentMessage,
    };

    // Only force-join member sockets when the conversation was just created
    // in this request (first message of a new direct conversation). For every
    // other case members are already in the conversation room — joined on
    // connection for existing convs, or via JOIN_CONVERSATION when added to
    // a group later. Routed through the same queued job the REST-triggered
    // member-add flow uses (see ConversationService), so message delivery
    // gets the same retry/durability instead of a same-process-only emit.
    if (isNewConversation) {
      await this.gatewayService.joinMembersToRoom(
        memberIds,
        sentMessage.conversation.id,
        broadcast,
      );
    } else {
      await this.gatewayService.broadcastToConversation(
        sentMessage.conversation.id,
        broadcast.event,
        broadcast.message,
        broadcast.data,
      );
    }
  }

  /**
   * Revoke a message (original sender only) and tell the room so clients
   * can render a "message recalled" placeholder.
   */
  @SubscribeMessage(chatEvent.REVOKE_MESSAGE)
  async handleRevokeMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() revokeMessageDTO: RevokeMessageDTO,
  ) {
    const { user } = client.data as ChatSocketData;
    const { messageId, conversationId } =
      await this.messageService.revokeMessage(
        user.sub,
        revokeMessageDTO.messageId,
      );
    await this.gatewayService.broadcastToConversation(
      conversationId,
      chatEvent.MESSAGE_REVOKED,
      message.chat.revoke_message.success,
      { messageId, conversationId },
    );
  }

  /**
   * Edit a message's text (original sender only) and tell the room so
   * clients can update the rendered message in place.
   */
  @SubscribeMessage(chatEvent.EDIT_MESSAGE)
  async handleEditMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() editMessageDTO: EditMessageDTO,
  ) {
    const { user } = client.data as ChatSocketData;
    const { messageId, conversationId, text, editedAt } =
      await this.messageService.editMessage(
        user.sub,
        editMessageDTO.messageId,
        editMessageDTO.text,
      );
    await this.gatewayService.broadcastToConversation(
      conversationId,
      chatEvent.MESSAGE_EDITED,
      message.chat.edit_message.success,
      { messageId, conversationId, text, editedAt },
    );
  }

  /**
   * Pin or unpin a message and tell the room so clients can update their
   * pinned-messages panel.
   */
  @SubscribeMessage(chatEvent.PIN_MESSAGE)
  async handlePinMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() pinMessageDTO: PinMessageDTO,
  ) {
    const { user } = client.data as ChatSocketData;

    const { messageId, conversationId, pinned } =
      await this.messageService.setMessagePinned(
        user.sub,
        pinMessageDTO.messageId,
        pinMessageDTO.pinned,
      );
    await this.gatewayService.broadcastToConversation(
      conversationId,
      chatEvent.MESSAGE_PIN_CHANGED,
      pinned
        ? message.chat.pin_message.pin_success
        : message.chat.pin_message.unpin_success,
      { messageId, conversationId, pinned },
    );
  }

  /**
   * Add or change the requester's reaction on a message, then broadcast the
   * fresh aggregated counts to the conversation room.
   */
  @SubscribeMessage(chatEvent.REACT_MESSAGE)
  async handleReactMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() reactMessageDTO: ReactMessageDTO,
  ) {
    const { user } = client.data as ChatSocketData;

    const { conversationId, reactions } =
      await this.messageService.setMessageReaction(
        user.sub,
        reactMessageDTO.messageId,
        reactMessageDTO.type,
      );
    await this.gatewayService.broadcastToConversation(
      conversationId,
      chatEvent.REACTION_UPDATED,
      message.chat.react_message.success,
      { messageId: reactMessageDTO.messageId, conversationId, reactions },
    );
  }

  /** Remove the requester's reaction from a message and broadcast new counts. */
  @SubscribeMessage(chatEvent.UNREACT_MESSAGE)
  async handleUnreactMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() unreactMessageDTO: UnreactMessageDTO,
  ) {
    const { user } = client.data as ChatSocketData;

    const { conversationId, reactions } =
      await this.messageService.removeMessageReaction(
        user.sub,
        unreactMessageDTO.messageId,
      );
    await this.gatewayService.broadcastToConversation(
      conversationId,
      chatEvent.REACTION_UPDATED,
      message.chat.react_message.remove_success,
      { messageId: unreactMessageDTO.messageId, conversationId, reactions },
    );
  }

  /**
   * Relay a typing indicator to the rest of the conversation room. No DB write;
   * `broadcast` excludes the sender's own socket.
   */
  @SubscribeMessage(chatEvent.TYPING)
  async handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() typingDTO: TypingDTO,
  ) {
    const { user } = client.data as ChatSocketData;

    const allowed = await this.chatRateLimiterService.checkLimit(
      chatEvent.TYPING,
      user.sub,
      this.typingRateLimit,
      this.typingRateWindowMs,
    );
    if (!allowed) {
      throw new ChatTypingRateLimitedException();
    }

    client.broadcast.to(chatRoom.conversation(typingDTO.conversationId)).emit(
      chatEvent.USER_TYPING,
      sendWsResponse(true, message.chat.typing.relay, {
        conversationId: typingDTO.conversationId,
        userDisplayName: user.displayName,
        isTyping: typingDTO.isTyping,
      }),
    );
  }
}
