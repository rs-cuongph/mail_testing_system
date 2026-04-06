import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateSettingsDto } from './dto/settings.dto';
import { encrypt, decrypt } from '../utils/crypto.util';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSettings() {
    const config = await this.prisma.systemConfig.findUnique({ where: { id: 1 } });
    if (!config) {
      throw new NotFoundException('Configuration not found');
    }

    return {
      imapHost: config.imapHost,
      imapPort: config.imapPort,
      imapUser: config.imapUser,
      imapPassword: '••••••••', // Masked password for UI
      imapTls: config.imapTls,
      imapMode: config.imapMode,
      imapPollInterval: config.imapPollInterval,
      mailDomain: config.mailDomain,
      mailBaseAddress: config.mailBaseAddress,
    };
  }

  async getRawPassword() {
    const config = await this.prisma.systemConfig.findUnique({ where: { id: 1 } });
    if (!config) {
      throw new NotFoundException('Configuration not found');
    }
    return decrypt(config.imapPassword);
  }

  async updateSettings(dto: UpdateSettingsDto) {
    let newPasswordEncrypted: string | undefined = undefined;

    if (dto.imapPassword && dto.imapPassword !== '••••••••') {
      newPasswordEncrypted = encrypt(dto.imapPassword);
    }

    const dataToSave: any = {
      imapHost: dto.imapHost,
      imapPort: dto.imapPort,
      imapUser: dto.imapUser,
      imapTls: dto.imapTls,
      imapMode: dto.imapMode,
      imapPollInterval: dto.imapPollInterval,
      mailDomain: dto.mailDomain,
      mailBaseAddress: dto.mailBaseAddress,
    };

    if (newPasswordEncrypted) {
      dataToSave.imapPassword = newPasswordEncrypted;
    }

    const saved = await this.prisma.systemConfig.upsert({
      where: { id: 1 },
      update: dataToSave,
      create: {
        ...dataToSave,
        imapPassword: Object.hasOwn(dataToSave, 'imapPassword') 
            ? dataToSave.imapPassword 
            : encrypt(''), // Fallback if no password provided on initial create
      },
    });

    return saved;
  }
}
