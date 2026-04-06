import { Module } from '@nestjs/common';
import { ProfilesController } from './profiles.controller';
import { ProfilesService } from './profiles.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ImapModule } from '../imap/imap.module';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [PrismaModule, ImapModule, EventsModule],
  controllers: [ProfilesController],
  providers: [ProfilesService],
  exports: [ProfilesService],
})
export class ProfilesModule {}
