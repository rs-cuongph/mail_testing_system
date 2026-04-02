import { Module } from '@nestjs/common';
import { ImapService } from './imap.service';
import { MailParserService } from './mail-parser.service';
import { ThreadsModule } from '../threads/threads.module';
import { EmailsModule } from '../emails/emails.module';

@Module({
  imports: [ThreadsModule, EmailsModule],
  providers: [ImapService, MailParserService],
  exports: [ImapService],
})
export class ImapModule {}
