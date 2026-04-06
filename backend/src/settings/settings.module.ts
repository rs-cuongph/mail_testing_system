import { Module } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { SettingsController } from './settings.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ImapModule } from '../imap/imap.module';
import { ProfilesModule } from '../profiles/profiles.module';

@Module({
  imports: [PrismaModule, ImapModule, ProfilesModule],
  providers: [SettingsService],
  controllers: [SettingsController],
  exports: [SettingsService],
})
export class SettingsModule {}
