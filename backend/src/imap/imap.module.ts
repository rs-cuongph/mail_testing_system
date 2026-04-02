import { Module } from '@nestjs/common';
import { ImapService } from './imap.service';
import { MailParserService } from './mail-parser.service';
import { ThreadsModule } from '../threads/threads.module';
import { EmailsModule } from '../emails/emails.module';
import { AttachmentsModule } from '../attachments/attachments.module';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [ThreadsModule, EmailsModule, AttachmentsModule, EventsModule],
  providers: [ImapService, MailParserService],
  exports: [ImapService],
})
export class ImapModule {}
