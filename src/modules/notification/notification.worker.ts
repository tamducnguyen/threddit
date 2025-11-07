import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { NotificationService } from './notification.service';
import { UserEntity } from '../entities/user.entity';
import { PostEntity } from '../entities/post.entity';
import { NotificationRepository } from './notification.repository';
import { NotificationEntity } from '../entities/notification.entity';
import { NotificationType } from '../enum/notificationtype.enum';
import {
  CreatePostNotification,
  FollowNotification,
  JobNotificationQueue,
  MentionNotification,
  NameNotificationQueue,
} from '../common/helper/notification.helper';

@Processor(NameNotificationQueue, {
  concurrency: parseInt(process.env.NOTIFICATION_CONCURRENCY || '5', 10),
})
export class NotificationWorker extends WorkerHost {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly notificationRepo: NotificationRepository,
  ) {
    super();
  }
  async process(job: Job) {
    switch (job.name) {
      //send notification to all followers
      case String(JobNotificationQueue.CREATE_POST): {
        type SendPostNotificationInterface = {
          currentUser: UserEntity;
          postCreated: PostEntity;
        };
        const data = job.data as SendPostNotificationInterface;
        const follows = await this.notificationRepo.getAllFollower(
          data.currentUser,
        );
        const notifications: Partial<NotificationEntity>[] = follows.map(
          (follow) => {
            return {
              owner: follow.follower,
              content: CreatePostNotification(data.currentUser.username),
              target: String(data.postCreated.id),
              type: NotificationType.CREATE_POST,
            };
          },
        );
        //insert notification
        await this.notificationRepo.insertNotifications(notifications);
        //notify
        notifications.forEach((notification) =>
          this.notificationService.notify(notification),
        );
        break;
      }
      //send notification to mentioned user
      case String(JobNotificationQueue.MENTION): {
        type SendMentionNotificationInterface = {
          currentUser: UserEntity;
          mentionedUser: UserEntity[];
          post: PostEntity;
        };
        const data = job.data as SendMentionNotificationInterface;
        const owners = data.mentionedUser;
        const notifications: Partial<NotificationEntity>[] = owners
          .filter((owner) => owner.id !== data.currentUser.id)
          .map((owner) => {
            return {
              owner: owner,
              content: MentionNotification(data.currentUser.username),
              target: String(data.post.id),
              type: NotificationType.MENTION,
            };
          });
        //insert notification
        await this.notificationRepo.insertNotifications(notifications);
        //notify
        notifications.forEach((notification) =>
          this.notificationService.notify(notification),
        );
        break;
      }
      //send notification to followee
      case String(JobNotificationQueue.FOLLOW): {
        type SendFollowNotificationInterface = {
          currentUser: UserEntity;
          followee: UserEntity;
        };
        const data = job.data as SendFollowNotificationInterface;
        const notification: Partial<NotificationEntity> = {
          owner: data.followee,
          content: FollowNotification(data.currentUser.username),
          type: NotificationType.FOLLOW,
          target: data.currentUser.username,
        };
        await this.notificationRepo.saveNotification(notification);
        this.notificationService.notify(notification);
        break;
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
