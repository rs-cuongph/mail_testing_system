import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProfilesService } from '../profiles/profiles.service';
import { UpdateSettingsDto } from './dto/settings.dto';
import { encrypt, decrypt } from '../utils/crypto.util';

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly profilesService: ProfilesService,
  ) {}

  async getSettings() {
    const defaultProfile = await this.profilesService.findActive();
    if (!defaultProfile) {
      throw new NotFoundException('Configuration not found');
    }

    return {
      imapHost: defaultProfile.imapHost,
      imapPort: defaultProfile.imapPort,
      imapUser: defaultProfile.imapUser,
      imapPassword: '••••••••',
      imapTls: defaultProfile.imapTls,
      imapMode: defaultProfile.imapMode,
      imapPollInterval: defaultProfile.imapPollInterval,
      mailDomain: defaultProfile.mailDomain,
      mailBaseAddress: defaultProfile.mailBaseAddress,
    };
  }

  async getRawPassword() {
    const raw = await this.prisma.imapProfile.findFirst({ where: { isActive: true } });
    if (!raw) {
      throw new NotFoundException('Configuration not found');
    }
    return decrypt(raw.imapPassword);
  }

  async updateSettings(dto: UpdateSettingsDto) {
    let raw = await this.prisma.imapProfile.findFirst({ where: { isActive: true } });

    const payload = {
      name: raw ? raw.name : 'Default System Profile',
      provider: raw ? raw.provider : 'custom',
      imapHost: dto.imapHost,
      imapPort: dto.imapPort,
      imapUser: dto.imapUser,
      imapTls: dto.imapTls,
      imapMode: dto.imapMode,
      imapPollInterval: dto.imapPollInterval,
      mailDomain: dto.mailDomain,
      mailBaseAddress: dto.mailBaseAddress,
      // If there's a new password passed, we encrypt it. Oh wait, profilesService handles encryption
    };

    if (dto.imapPassword && dto.imapPassword !== '••••••••') {
      (payload as any).imapPassword = dto.imapPassword;
    }

    let saved;
    if (raw) {
      saved = await this.profilesService.update(raw.id, payload);
    } else {
      saved = await this.profilesService.create(payload as any);
      await this.profilesService.activate(saved.id);
    }

    return saved;
  }
}
