import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Controller('config')
export class ConfigController {
  private readonly mailDomain: string;
  private readonly mailBaseAddress: string;

  constructor(private readonly config: ConfigService) {
    this.mailDomain = this.config.get<string>('MAIL_DOMAIN', 'runsystem.work').trim() || 'runsystem.work';
    this.mailBaseAddress = this.config.get<string>('MAIL_BASE_ADDRESS', 'gens').trim() || 'gens';
  }

  @Get()
  getConfig() {
    return {
      mailDomain: this.mailDomain,
      mailBaseAddress: this.mailBaseAddress,
    };
  }
}
