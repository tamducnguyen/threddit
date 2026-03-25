import {
  BadRequestException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Observable, Subject } from 'rxjs';
import { AuthUser } from '../token/authuser.interface';
import { NotificationEntity } from '../entities/notification.entity';
import { NotificationRepository } from './notification.repository';
import { message } from '../common/helper/message.helper';
import { JwtService } from '@nestjs/jwt';
import { Cursor } from '../interface/cursor.interface';
import { sendResponse } from '../common/helper/response.helper';
import { errorCode } from '../common/helper/errorcode.helper';
import { ConfigService } from '@nestjs/config';
import { ConvertMediaRelativePathToUrl } from '../common/helper/media-url.helper';

@Injectable()
export class NotificationService {
  constructor(
    private readonly notificationRepo: NotificationRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}
  private bus = new Subject<Partial<NotificationEntity>>();
  private buildTargetWithActor(
    rawTarget: {
      actorId?: number;
      actorUsername?: string;
      actorDisplayName?: string;
      actorAvatarUrl?: string;
      [key: string]: unknown;
    },
    actor?: {
      username: string;
      displayName: string;
      avatarRelativePath: string;
    },
  ) {
    const target = { ...rawTarget };
    if (actor) {
      target.actorUsername = actor.username;
      target.actorDisplayName = actor.displayName;
      target.actorAvatarUrl = ConvertMediaRelativePathToUrl(
        this.configService,
        actor.avatarRelativePath,
      );
      delete target.actorId;
    }
    return target;
  }
  /**
   * create stream for user listening notification
   * @param currentUser
   * @returns
   */
  async createStream(currentUser: AuthUser) {
    //check if user exist
    const userFound = await this.notificationRepo.findUserById(currentUser.sub);
    if (!userFound) {
      throw new BadRequestException(
        sendResponse(
          HttpStatus.BAD_REQUEST,
          message.notification.create_stream.user_not_found,
          undefined,
          errorCode.notification.create_stream.user_not_found,
        ),
      );
    }
    //create stream
    const heartbeatIntervalMs =
      this.configService.getOrThrow<number>('HEARTBEAT_GAP_TIME');
    return new Observable((subscriber) => {
      const sub = this.bus.subscribe((notificationRaw: NotificationEntity) => {
        if (notificationRaw.owner.id !== userFound.id) {
          return;
        }
        void (async () => {
          try {
            const rawTarget = notificationRaw.target as {
              actorId?: number;
              actorUsername?: string;
              actorDisplayName?: string;
              actorAvatarUrl?: string;
              [key: string]: unknown;
            };
            let actor:
              | {
                  username: string;
                  displayName: string;
                  avatarRelativePath: string;
                }
              | undefined;
            if (typeof rawTarget?.actorId === 'number') {
              const [actorFound] = await this.notificationRepo.findUsersByIds([
                rawTarget.actorId,
              ]);
              actor = actorFound;
            }
            const notification = {
              id: notificationRaw.id,
              createdAt: notificationRaw.createdAt,
              type: notificationRaw.type,
              target: this.buildTargetWithActor(rawTarget, actor),
              isRead: notificationRaw.isRead,
            };
            subscriber.next({ data: notification });
          } catch {
            subscriber.next({ data: notificationRaw });
          }
        })();
      });
      const heartbeatTimer = setInterval(() => {
        subscriber.next({});
      }, heartbeatIntervalMs);
      return () => {
        clearInterval(heartbeatTimer);
        sub.unsubscribe();
      };
    });
  }
  /**
   * notify user
   * @param notification
   */
  notify(notificationCreated: Partial<NotificationEntity>) {
    //notify
    this.bus.next(notificationCreated);
  }
  /**
   * get notification
   * @param currentUser
   * @param cursor
   * @returns
   */
  async getNotification(currentUser: AuthUser, cursor?: string) {
    //check if user exist
    const { sub } = currentUser;
    const userFound = await this.notificationRepo.findUserById(sub);
    if (!userFound) {
      throw new BadRequestException(
        sendResponse(
          HttpStatus.BAD_REQUEST,
          message.notification.get_notification.user_not_found,
          undefined,
          errorCode.notification.get_notification.user_not_found,
        ),
      );
    }
    //check if has cursor -> verify cursor
    let cursorDecoded: Cursor | undefined;
    if (cursor) {
      try {
        cursorDecoded = await this.jwtService.verifyAsync<Cursor>(cursor);
      } catch {
        throw new BadRequestException(
          sendResponse(
            HttpStatus.BAD_REQUEST,
            message.notification.get_notification.cursor_invalid,
            undefined,
            errorCode.notification.get_notification.cursor_invalid,
          ),
        );
      }
    } else {
      cursorDecoded = undefined;
    }
    //get notifications
    const notificationsRaw = await this.notificationRepo.findNotification(
      userFound,
      cursorDecoded,
    );
    //check if has notification
    const notificationFinal = notificationsRaw[notificationsRaw.length - 1];
    if (!notificationFinal) {
      return sendResponse(
        HttpStatus.OK,
        message.notification.get_notification.no_content,
        { notifications: [], cursor: null },
      );
    }
    //load actor info for response (backward-compatible fields)
    const actorIds = Array.from(
      new Set(
        notificationsRaw
          .map((notification) => {
            const target = notification.target as {
              actorId?: number;
            };
            return typeof target?.actorId === 'number' ? target.actorId : null;
          })
          .filter((id): id is number => typeof id === 'number'),
      ),
    );
    const actors = await this.notificationRepo.findUsersByIds(actorIds);
    const actorMap = new Map(actors.map((actor) => [actor.id, actor]));
    //mapping data
    const notifications = notificationsRaw.map((notification) => {
      const rawTarget = notification.target as {
        actorId?: number;
        actorUsername?: string;
        actorDisplayName?: string;
        actorAvatarUrl?: string;
        [key: string]: unknown;
      };
      const actorId =
        typeof rawTarget?.actorId === 'number' ? rawTarget.actorId : undefined;
      const actor = actorId ? actorMap.get(actorId) : undefined;
      const target = this.buildTargetWithActor(rawTarget, actor);
      return {
        id: notification.id,
        isRead: notification.isRead,
        type: notification.type,
        target: target,
        createdAt: notification.createdAt,
      };
    });
    //sign cursor
    const cursorPayload = {
      id: notificationFinal.id,
    };
    const cursorToken = await this.jwtService.signAsync(cursorPayload);
    //send response
    const data = {
      notifications: notifications,
      cursor: cursorToken,
    };
    return sendResponse(
      HttpStatus.OK,
      message.notification.get_notification.success,
      data,
    );
  }
  /**
   * get unread notifications
   * @param currentUser
   * @param cursor
   * @returns
   */
  async getUnreadNotification(currentUser: AuthUser, cursor?: string) {
    //check if user exist
    const { sub } = currentUser;
    const userFound = await this.notificationRepo.findUserById(sub);
    if (!userFound) {
      throw new BadRequestException(
        sendResponse(
          HttpStatus.BAD_REQUEST,
          message.notification.get_unread_notification.user_not_found,
          undefined,
          errorCode.notification.get_unread_notification.user_not_found,
        ),
      );
    }
    //check if has cursor
    let cursorDecoded: Cursor | undefined;
    if (cursor) {
      try {
        cursorDecoded = await this.jwtService.verifyAsync<Cursor>(cursor);
      } catch {
        throw new BadRequestException(
          sendResponse(
            HttpStatus.BAD_REQUEST,
            message.notification.get_unread_notification.cursor_invalid,
            undefined,
            errorCode.notification.get_unread_notification.cursor_invalid,
          ),
        );
      }
    } else {
      cursorDecoded = undefined;
    }
    //get unread notifications
    const unreadNotificationRaw =
      await this.notificationRepo.getUnreadNotification(
        userFound,
        cursorDecoded,
      );
    //check if has unread notification
    const unreadNotificationFinal =
      unreadNotificationRaw[unreadNotificationRaw.length - 1];
    if (!unreadNotificationFinal) {
      return sendResponse(
        HttpStatus.OK,
        message.notification.get_unread_notification.no_content,
        { unreadNotifications: [], cursor: null },
      );
    }
    const actorIds = Array.from(
      new Set(
        unreadNotificationRaw
          .map((notification) => {
            const target = notification.target as { actorId?: number };
            return typeof target?.actorId === 'number' ? target.actorId : null;
          })
          .filter((id): id is number => typeof id === 'number'),
      ),
    );
    const actors = await this.notificationRepo.findUsersByIds(actorIds);
    const actorMap = new Map(actors.map((actor) => [actor.id, actor]));
    //mapping data
    const unreadNotifications = unreadNotificationRaw.map((notification) => {
      const rawTarget = notification.target as {
        actorId?: number;
        actorUsername?: string;
        actorDisplayName?: string;
        actorAvatarUrl?: string;
        [key: string]: unknown;
      };
      const actorId =
        typeof rawTarget?.actorId === 'number' ? rawTarget.actorId : undefined;
      const actor = actorId ? actorMap.get(actorId) : undefined;
      const target = this.buildTargetWithActor(rawTarget, actor);
      return {
        id: notification.id,
        isRead: notification.isRead,
        type: notification.type,
        target: target,
        createdAt: notification.createdAt,
      };
    });
    //sign cursor
    const cursorPayload = {
      id: unreadNotificationFinal.id,
    };
    const cursorToken = await this.jwtService.signAsync(cursorPayload);
    //send response
    const data = {
      unreadNotifications: unreadNotifications,
      cursor: cursorToken,
    };
    return sendResponse(
      HttpStatus.OK,
      message.notification.get_unread_notification.success,
      data,
    );
  }
  /**
   * read notification
   * @param userId
   * @param notificationId
   * @returns
   */
  async readNotification(userId: number, notificationId: number) {
    //switch is_read status to true
    const updateResult = await this.notificationRepo.readNotification(
      notificationId,
      userId,
    );
    if (!updateResult.affected) {
      throw new NotFoundException(
        sendResponse(
          HttpStatus.NOT_FOUND,
          message.notification.read_notification.not_found_or_already_read,
          undefined,
          errorCode.notification.read_notification.not_found_or_already_read,
        ),
      );
    }
    return sendResponse(
      HttpStatus.OK,
      message.notification.read_notification.success,
    );
  }
  async deleteNotification(userId: number, notificationId: number) {
    const deleteResult = await this.notificationRepo.deleteNotification(
      notificationId,
      userId,
    );
    if (!deleteResult.affected) {
      throw new NotFoundException(
        sendResponse(
          HttpStatus.NOT_FOUND,
          message.notification.delete_notification.not_found,
          undefined,
          errorCode.notification.delete_notification.not_found,
        ),
      );
    }
    return sendResponse(
      HttpStatus.OK,
      message.notification.delete_notification.success,
    );
  }
  async getCountUnreadNotification(sub: number) {
    //check if user exist
    const userFound = await this.notificationRepo.findUserById(sub);
    if (!userFound) {
      throw new NotFoundException(
        sendResponse(
          HttpStatus.NOT_FOUND,
          message.notification.get_count_unread.user_not_found,
          undefined,
          errorCode.notification.get_count_unread.user_not_found,
        ),
      );
    }
    //get unread notification number
    const unreadNotificationNumber =
      await this.notificationRepo.getUnreadNotificationCount(userFound);
    return sendResponse(
      HttpStatus.OK,
      message.notification.get_count_unread.success,
      unreadNotificationNumber,
    );
  }
  async readAllNotifications(currentUser: AuthUser) {
    //switch is_read status to true
    await this.notificationRepo.readAllNotifications(currentUser.sub);
    return sendResponse(
      HttpStatus.OK,
      message.notification.read_all_notifications.success,
    );
  }
}
