import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { NotificationService } from './notification.service';
import { UserEntity } from '../entities/user.entity';
import { ContentEntity } from '../entities/content.entity';
import { NotificationRepository } from './notification.repository';
import { NotificationEntity } from '../entities/notification.entity';
import { NotificationType } from '../enum/notificationtype.enum';
import {
  CommentNotificationMessage,
  FriendAcceptedNotificationMessage,
  FriendConnectedNotificationMessage,
  FollowingContentCreationNotificationMessage,
  FollowNotificationMessage,
  FriendContentCreationNotificationMessage,
  FriendRequestNotificationMessage,
  JobNotificationQueue,
  MentionInCommentNotificationMessage,
  MentionInContentNotificationMessage,
  NameNotificationQueue,
} from './helper/notification.helper';
import { CommentEntity } from '../entities/comment.entity';
import { NotificationTarget } from '../enum/notificationtarger.type';
import { ConfigService } from '@nestjs/config';
import { ConvertMediaRelativePathToUrl } from '../common/helper/media-url.helper';

@Processor(NameNotificationQueue, {
  concurrency: parseInt(process.env.NOTIFICATION_CONCURRENCY || '5', 10),
})
export class NotificationWorker extends WorkerHost {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly notificationRepo: NotificationRepository,
    private readonly configService: ConfigService,
  ) {
    super();
  }
  async process(job: Job) {
    switch (job.name) {
      //send content creation notification to all friends and followers
      case String(JobNotificationQueue.CONTENT_CREATION): {
        type SendPostNotificationInterface = {
          currentUser: UserEntity;
          createdContent: ContentEntity;
        };
        const data = job.data as SendPostNotificationInterface;
        //get all friends
        const friends = await this.notificationRepo.getAllFriends(
          data.currentUser,
        );
        //get all followers
        const followers = await this.notificationRepo.getAllFollowers(
          data.currentUser,
        );
        //filter followers who are friend
        const friendIds = new Set(friends.map((f) => f.id));
        const pureFollowers = followers.filter(
          (follower) => !friendIds.has(follower.id),
        );
        //create notifications for friends
        const friendNotifications: Partial<NotificationEntity>[] = friends.map(
          (friend) => {
            const actorAvatarUrl = ConvertMediaRelativePathToUrl(
              this.configService,
              data.currentUser.avatarRelativePath,
            );
            const target: NotificationTarget = {
              type: 'FRIEND_CONTENT_CREATION',
              contentId: data.createdContent.id,
              contentType: data.createdContent.type,
              actorAvatarUrl: actorAvatarUrl,
              actorDisplayName: data.currentUser.displayName,
              actorUsername: data.currentUser.username,
            };
            return {
              owner: friend,
              message: FriendContentCreationNotificationMessage(
                data.currentUser.displayName,
                data.createdContent.type,
              ),
              target: target,
              type: NotificationType.FRIEND_CONTENT_CREATION,
            };
          },
        );
        //create notifications for followers
        const followerNotifications: Partial<NotificationEntity>[] =
          pureFollowers.map((follower) => {
            const actorAvatarUrl = ConvertMediaRelativePathToUrl(
              this.configService,
              data.currentUser.avatarRelativePath,
            );
            const target: NotificationTarget = {
              type: 'FOLLOWING_CONTENT_CREATION',
              contentId: data.createdContent.id,
              contentType: data.createdContent.type,
              actorAvatarUrl: actorAvatarUrl,
              actorDisplayName: data.currentUser.displayName,
              actorUsername: data.currentUser.username,
            };
            return {
              owner: follower,
              message: FollowingContentCreationNotificationMessage(
                data.currentUser.displayName,
                data.createdContent.type,
              ),
              target: target,
              type: NotificationType.FOLLOWING_CONTENT_CREATION,
            };
          });
        //insert notification
        const notifications = [
          ...friendNotifications,
          ...followerNotifications,
        ];
        const insertedNotifications =
          await this.notificationRepo.insertNotifications(notifications);
        //notify
        insertedNotifications.forEach((insertedNotification) =>
          this.notificationService.notify(insertedNotification),
        );
        break;
      }
      //send notification to mentioned friends in content
      case String(JobNotificationQueue.MENTION_IN_CONTENT): {
        type SendMentionNotificationInterface = {
          currentUser: UserEntity;
          mentionedFriends: UserEntity[];
          mentioningContent: ContentEntity;
        };
        const data = job.data as SendMentionNotificationInterface;
        const friends = data.mentionedFriends;
        //should check if mentioned user are friends and not self
        const target: NotificationTarget = {
          type: 'MENTION_IN_CONTENT',
          contentId: data.mentioningContent.id,
          contentType: data.mentioningContent.type,
          actorAvatarUrl: ConvertMediaRelativePathToUrl(
            this.configService,
            data.currentUser.avatarRelativePath,
          ),
          actorDisplayName: data.currentUser.displayName,
          actorUsername: data.currentUser.username,
        };
        const notifications: Partial<NotificationEntity>[] = friends
          .filter((friend) => friend.id !== data.currentUser.id)
          .map((friend) => {
            return {
              owner: friend,
              message: MentionInContentNotificationMessage(
                data.currentUser.displayName,
                data.mentioningContent.type,
              ),
              target: target,
              type: NotificationType.MENTION_IN_CONTENT,
            };
          });
        //insert notification
        const insertedNotifications =
          await this.notificationRepo.insertNotifications(notifications);
        //notify
        insertedNotifications.forEach((insertedNotification) =>
          this.notificationService.notify(insertedNotification),
        );
        break;
      }
      //send follow notification to followee
      case String(JobNotificationQueue.FOLLOW): {
        type SendFollowNotificationInterface = {
          currentUser: UserEntity;
          followee: UserEntity;
        };
        const data = job.data as SendFollowNotificationInterface;
        const target: NotificationTarget = {
          type: 'FOLLOW',
          actorAvatarUrl: ConvertMediaRelativePathToUrl(
            this.configService,
            data.currentUser.avatarRelativePath,
          ),
          actorDisplayName: data.currentUser.displayName,
          actorUsername: data.currentUser.username,
        };
        const notification: Partial<NotificationEntity> = {
          owner: data.followee,
          message: FollowNotificationMessage(data.currentUser.displayName),
          type: NotificationType.FOLLOW,
          target: target,
        };
        const insertedNotification =
          await this.notificationRepo.saveNotification(notification);
        this.notificationService.notify(insertedNotification);
        break;
      }
      //send friend request notification to recipient
      case String(JobNotificationQueue.FRIEND_REQUEST): {
        type SendFriendRequestNotificationInterface = {
          requester: UserEntity;
          recipient: UserEntity;
        };
        const data = job.data as SendFriendRequestNotificationInterface;
        const target: NotificationTarget = {
          type: 'FRIEND_REQUEST',
          actorAvatarUrl: ConvertMediaRelativePathToUrl(
            this.configService,
            data.requester.avatarRelativePath,
          ),
          actorDisplayName: data.requester.displayName,
          actorUsername: data.requester.username,
        };
        const notification: Partial<NotificationEntity> = {
          owner: data.recipient,
          message: FriendRequestNotificationMessage(data.requester.displayName),
          type: NotificationType.FRIEND_REQUEST,
          target: target,
        };
        const insertedNotification =
          await this.notificationRepo.saveNotification(notification);
        this.notificationService.notify(insertedNotification);
        break;
      }
      //send friend accepted notification to both users
      case String(JobNotificationQueue.FRIEND_ACCEPTED): {
        type SendFriendAcceptedNotificationInterface = {
          requester: UserEntity;
          recipient: UserEntity;
        };
        const data = job.data as SendFriendAcceptedNotificationInterface;
        const requesterTarget: NotificationTarget = {
          type: 'FRIEND_ACCEPTED',
          actorAvatarUrl: ConvertMediaRelativePathToUrl(
            this.configService,
            data.recipient.avatarRelativePath,
          ),
          actorDisplayName: data.recipient.displayName,
          actorUsername: data.recipient.username,
        };
        const recipientTarget: NotificationTarget = {
          type: 'FRIEND_ACCEPTED',
          actorAvatarUrl: ConvertMediaRelativePathToUrl(
            this.configService,
            data.requester.avatarRelativePath,
          ),
          actorDisplayName: data.requester.displayName,
          actorUsername: data.requester.username,
        };
        const notifications: Partial<NotificationEntity>[] = [
          {
            owner: data.requester,
            message: FriendAcceptedNotificationMessage(
              data.recipient.displayName,
            ),
            type: NotificationType.FRIEND_ACCEPTED,
            target: requesterTarget,
          },
          {
            owner: data.recipient,
            message: FriendConnectedNotificationMessage(
              data.requester.displayName,
            ),
            type: NotificationType.FRIEND_ACCEPTED,
            target: recipientTarget,
          },
        ];
        const insertedNotifications =
          await this.notificationRepo.insertNotifications(notifications);
        insertedNotifications.forEach((insertedNotification) =>
          this.notificationService.notify(insertedNotification),
        );
        break;
      }
      //send notification comment to author
      case String(JobNotificationQueue.COMMENT): {
        type SendCommentNotifcationInterface = {
          comment: CommentEntity;
        };
        const data = job.data as SendCommentNotifcationInterface;
        const target: NotificationTarget = {
          type: 'COMMENT',
          contentId: data.comment.content.id,
          commentId: data.comment.id,
          actorAvatarUrl: ConvertMediaRelativePathToUrl(
            this.configService,
            data.comment.commenter.avatarRelativePath,
          ),
          actorDisplayName: data.comment.commenter.displayName,
          actorUsername: data.comment.commenter.username,
        };
        const notification: Partial<NotificationEntity> = {
          owner: data.comment.content.author,
          message: CommentNotificationMessage(
            data.comment.commenter.displayName,
          ),
          type: NotificationType.COMMENT,
          target: target,
        };
        const insertNotification =
          await this.notificationRepo.saveNotification(notification);
        this.notificationService.notify(insertNotification);
        break;
      }
      //send notification to mentioned comment user
      case String(JobNotificationQueue.MENTION_IN_COMMENT): {
        type SendMentionCommentNotificationInterface = {
          comment: CommentEntity;
          mentionedFriends: UserEntity[];
        };
        const data = job.data as SendMentionCommentNotificationInterface;
        const mentionedFriends = data.mentionedFriends;
        const target: NotificationTarget = {
          type: 'MENTION_IN_COMMENT',
          contentId: data.comment.content.id,
          commentId: data.comment.id,
          actorAvatarUrl: ConvertMediaRelativePathToUrl(
            this.configService,
            data.comment.commenter.avatarRelativePath,
          ),
          actorDisplayName: data.comment.commenter.displayName,
          actorUsername: data.comment.commenter.username,
        };
        const notifications: Partial<NotificationEntity>[] =
          mentionedFriends.map((mentionFriend) => {
            return {
              owner: mentionFriend,
              message: MentionInCommentNotificationMessage(
                data.comment.commenter.displayName,
              ),
              target: target,
              type: NotificationType.MENTION_IN_COMMENT,
            };
          });
        //insert notification
        const insertedNotifications =
          await this.notificationRepo.insertNotifications(notifications);
        //notify
        insertedNotifications.forEach((insertedNotification) =>
          this.notificationService.notify(insertedNotification),
        );
        break;
      }
      default: {
        console.log(`Job ${job.id} Not match any job cases`);
      }
    }
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
