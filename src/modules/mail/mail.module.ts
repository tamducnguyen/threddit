import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { MailService } from './mail.service';
import { MailWorker } from './mail.worker';
import { NameMailQueue } from './helper/mail.helper';

@Module({
  imports: [
    BullModule.registerQueue({
      name: NameMailQueue,
    }),
  ],
  providers: [MailService, MailWorker],
  exports: [MailService, BullModule],
})
export class MailModule {}
