import { Controller, Get, Post, Body, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/settings.dto';
import { ImapService } from '../imap/imap.service';

@Controller('api/settings')
export class SettingsController {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly imapService: ImapService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Get()
  async getSettings() {
    return await this.settingsService.getSettings();
  }

  @Get('status')
  getStatus() {
    return this.imapService.getStatus();
  }

  @Post()
  async updateSettings(@Body() dto: UpdateSettingsDto) {
    // Determine the actual password to test with
    let testPassword = dto.imapPassword;
    if (!testPassword || testPassword === '••••••••') {
      try {
        testPassword = await this.settingsService.getRawPassword();
      } catch (e) {
        throw new BadRequestException('Password required for initial setup');
      }
    }

    // 1. Test IMAP Connection
    try {
      await this.imapService.testConnection({
        host: dto.imapHost,
        port: dto.imapPort,
        secure: dto.imapTls,
        user: dto.imapUser,
        pass: testPassword,
      });
    } catch (err) {
      throw new BadRequestException(`IMAP connection failed: ${err.message}`);
    }

    // 2. Save settings
    await this.settingsService.updateSettings(dto);

    // 3. EVENT EMITTING
    this.eventEmitter.emit('config.updated');

    return {
      success: true,
      message: 'Configuration updated and connected',
    };
  }
}

