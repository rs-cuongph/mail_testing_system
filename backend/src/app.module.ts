import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaModule } from './prisma/prisma.module';
import { ThreadsModule } from './threads/threads.module';
import { EmailsModule } from './emails/emails.module';
import { AttachmentsModule } from './attachments/attachments.module';
import { ImapModule } from './imap/imap.module';
import { EventsModule } from './events/events.module';
import { ConfigController } from './config/config.controller';
import { CategoriesModule } from './categories/categories.module';
import { SettingsModule } from './settings/settings.module';
import { ProfilesModule } from './profiles/profiles.module';
import { CredentialsModule } from './credentials/credentials.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(),
    CredentialsModule,
    PrismaModule,
    EventsModule,
    ImapModule,
    ThreadsModule,
    EmailsModule,
    AttachmentsModule,
    CategoriesModule,
    SettingsModule,
    ProfilesModule,
  ],
  controllers: [ConfigController],
})
export class AppModule {}
