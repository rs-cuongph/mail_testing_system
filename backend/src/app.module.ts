import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { ThreadsModule } from './threads/threads.module';
import { EmailsModule } from './emails/emails.module';
import { AttachmentsModule } from './attachments/attachments.module';
import { ImapModule } from './imap/imap.module';
import { EventsModule } from './events/events.module';
import { ConfigController } from './config/config.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    EventsModule,
    ImapModule,
    ThreadsModule,
    EmailsModule,
    AttachmentsModule,
  ],
  controllers: [ConfigController],
})
export class AppModule {}
