import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { MailService } from './mail.service';
import { JobMailQueue, NameMailQueue } from './helper/mail.helper';

@Processor(NameMailQueue, {
  concurrency: parseInt(process.env.MAIL_CONCURRENCY || '5', 10),
})
export class MailWorker extends WorkerHost {
  constructor(private readonly mailService: MailService) {
    super();
  }
  async process(job: Job) {
    switch (job.name) {
      case String(JobMailQueue.SEND_VERIFY_CODE): {
        type SendVerifyCodeMailInterface = {
          email: string;
          verificationCode: string;
        };
        const data = job.data as SendVerifyCodeMailInterface;
        const isSent = await this.mailService.sendVerifyCode(
          data.email,
          data.verificationCode,
        );
        if (!isSent) {
          throw new Error(
            `Failed to send signup verification mail to ${data.email}`,
          );
        }
        break;
      }
      case String(JobMailQueue.SEND_DELETE_ACCOUNT): {
        type SendDeleteAccountMailInterface = {
          email: string;
          verificationCode: string;
        };
        const data = job.data as SendDeleteAccountMailInterface;
        const isSent = await this.mailService.sendDeleteAccount(
          data.email,
          data.verificationCode,
        );
        if (!isSent) {
          throw new Error(
            `Failed to send delete account verification mail to ${data.email}`,
          );
        }
        break;
      }
      case String(JobMailQueue.SEND_FORGOT_PASSWORD): {
        type SendForgotPasswordMailInterface = {
          email: string;
          verificationCode: string;
        };
        const data = job.data as SendForgotPasswordMailInterface;
        const isSent = await this.mailService.sendForgotPassword(
          data.email,
          data.verificationCode,
        );
        if (!isSent) {
          throw new Error(
            `Failed to send forgot password mail to ${data.email}`,
          );
        }
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
