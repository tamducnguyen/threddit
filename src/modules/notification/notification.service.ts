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

@Injectable()
export class NotificationService {
  constructor(
    private readonly notificationRepo: NotificationRepository,
    private readonly jwtService: JwtService,
  ) {}
  private bus = new Subject<Partial<NotificationEntity>>();
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
        message.notification.create_stream.user_not_found,
      );
    }
    //create stream
    return new Observable<{ data: Partial<NotificationEntity> }>(
      (subscriber) => {
        const sub = this.bus.subscribe(
          (notificationRaw: NotificationEntity) => {
            if (notificationRaw.owner.id === userFound.id) {
              const notification: Partial<NotificationEntity> = {
                id: notificationRaw.id,
                createdAt: notificationRaw.createdAt,
                isRead: notificationRaw.isRead,
                content: notificationRaw.content,
              };
              subscriber.next({ data: notification });
            }
          },
        );
        return () => sub.unsubscribe();
      },
    );
  }
  /**
   * notify user
   * @param notification
   */
  async notify(notification: Partial<NotificationEntity>) {
    //store into db
    const notificationCreated =
      await this.notificationRepo.saveNotification(notification);
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
        message.notification.get_notification.user_not_found,
      );
    }
    //check if has cursor -> verify cursor
    let cursorDecoded: Cursor | undefined;
    if (cursor) {
      try {
        cursorDecoded = await this.jwtService.verifyAsync<Cursor>(cursor);
      } catch {
        throw new BadRequestException(
          message.notification.get_notification.cursor_invalid,
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
        HttpStatus.NO_CONTENT,
        message.notification.get_notification.no_content,
      );
    }
    //mapping data
    const notifications = notificationsRaw.map((notification) => {
      return {
        id: notification.id,
        content: notification.content,
        isRead: notification.isRead,
        type: notification.type,
        target: notification.target,
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
        message.notification.get_unread_notification.user_not_found,
      );
    }
    //check if has cursor
    let cursorDecoded: Cursor | undefined;
    if (cursor) {
      try {
        cursorDecoded = await this.jwtService.verifyAsync<Cursor>(cursor);
      } catch {
        throw new BadRequestException(
          message.notification.get_unread_notification.cursor_invalid,
        );
      }
    } else {
      cursorDecoded = undefined;
    }
    //get unread notifications
    const unreadNotificationRaw =
      await this.notificationRepo.getUnreadNotificatiom(
        userFound,
        cursorDecoded,
      );
    //check if has unread notification
    const unreadNotificationFinal =
      unreadNotificationRaw[unreadNotificationRaw.length - 1];
    if (!unreadNotificationFinal) {
      return sendResponse(
        HttpStatus.NO_CONTENT,
        message.notification.get_unread_notification.no_content,
      );
    }
    //mapping data
    const unreadNotifications = unreadNotificationRaw.map((notification) => {
      return {
        id: notification.id,
        content: notification.content,
        isRead: notification.isRead,
        type: notification.type,
        target: notification.target,
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
   * post read state
   */
  async postReadNotification(sub: string, id: number) {
    //check if user exist
    const userFound = await this.notificationRepo.findUserById(sub);
    if (!userFound) {
      throw new NotFoundException(
        message.notification.post_read_notification.user_not_found,
      );
    }
    //check if notify exist and unread
    const isUnReadAndExist = await this.notificationRepo.checkNotification(id);
    if (isUnReadAndExist) {
      throw new NotFoundException(
        message.notification.post_read_notification.not_found_or_already_read,
      );
    }
    //switch read state
    await this.notificationRepo.switchReadState(id);
    return sendResponse(
      HttpStatus.OK,
      message.notification.post_read_notification.success,
    );
  }
  async getCountUnreadNotificationount(sub: string) {
    //check if user exist
    const userFound = await this.notificationRepo.findUserById(sub);
    if (!userFound) {
      throw new NotFoundException(
        message.notification.get_count_unread.user_not_found,
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
}
