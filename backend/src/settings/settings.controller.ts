import { BadRequestException, Body, Controller, Get, Post } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ImapService } from '../imap/imap.service';
import { UpdateSettingsDto } from './dto/settings.dto';
import { SettingsService } from './settings.service';

const MASKED_PASSWORD = '••••••••';

@Controller('settings')
export class SettingsController {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly imapService: ImapService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Get()
  async getSettings() {
    return this.settingsService.getSettings();
  }

  @Get('status')
  getStatus() {
    return this.imapService.getStatus();
  }

  @Post()
  async updateSettings(@Body() dto: UpdateSettingsDto) {
    let testPassword: string | null = dto.imapPassword ?? null;
    if (!testPassword || testPassword === MASKED_PASSWORD) {
      try {
        testPassword = await this.settingsService.getRawPassword();
      } catch {
        throw new BadRequestException('Password required for initial setup');
      }
    }

    if (!testPassword) {
      throw new BadRequestException('Password required for initial setup');
    }

    try {
      await this.imapService.testConnection({
        host: dto.imapHost,
        port: dto.imapPort,
        secure: dto.imapTls,
        user: dto.imapUser,
        pass: testPassword,
      });
    } catch (err: any) {
      throw new BadRequestException(`IMAP connection failed: ${err.message}`);
    }

    await this.settingsService.updateSettings(dto);
    this.eventEmitter.emit('config.updated');

    return {
      success: true,
      message: 'Configuration updated and connected',
    };
  }
}
