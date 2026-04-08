import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CredentialBridgeService } from '../credentials/credential-bridge.service';
import { EventsGateway } from '../events/events.gateway';
import { ImapService } from '../imap/imap.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProfileDto, UpdateProfileDto } from './dto/profile.dto';

const MASKED_PASSWORD = '••••••••';

@Injectable()
export class ProfilesService {
  private readonly logger = new Logger(ProfilesService.name);

  constructor(
    private prisma: PrismaService,
    private imapService: ImapService,
    private eventEmitter: EventEmitter2,
    private eventsGateway: EventsGateway,
    private credentialBridge: CredentialBridgeService,
  ) {}

  async findAll() {
    const profiles = await this.prisma.imapProfile.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return profiles.map((profile) => this.excludePassword(profile));
  }

  async findOne(id: string) {
    const profile = await this.prisma.imapProfile.findUnique({ where: { id } });
    if (!profile) throw new NotFoundException('Profile not found');
    return this.excludePassword(profile);
  }

  async findActive() {
    const profile = await this.prisma.imapProfile.findFirst({ where: { isActive: true } });
    return profile ? this.excludePassword(profile) : null;
  }

  async getRawPassword(id: string) {
    const profile = await this.prisma.imapProfile.findUnique({ where: { id } });
    if (!profile) throw new NotFoundException('Profile not found');
    return this.credentialBridge.getPassword(profile.credentialKey);
  }

  async create(dto: CreateProfileDto) {
    const existing = await this.prisma.imapProfile.findUnique({ where: { name: dto.name } });
    if (existing) {
      throw new BadRequestException('Profile name already exists');
    }

    if (!dto.imapPassword) {
      throw new BadRequestException('Password is required for new profiles');
    }

    await this.assertConnectionWorks({
      host: dto.imapHost,
      port: dto.imapPort || 993,
      secure: dto.imapTls !== false,
      user: dto.imapUser,
      pass: dto.imapPassword,
    });

    const isFirstProfile = (await this.prisma.imapProfile.count()) === 0;
    const credentialKey = await this.credentialBridge.savePassword(dto.imapPassword);

    const profile = await this.prisma.imapProfile.create({
      data: {
        name: dto.name,
        provider: dto.provider || 'custom',
        imapHost: dto.imapHost,
        imapPort: dto.imapPort || 993,
        imapUser: dto.imapUser,
        credentialKey,
        imapTls: dto.imapTls !== false,
        imapMode: dto.imapMode || 'idle',
        imapPollInterval: dto.imapPollInterval || 5000,
        mailDomain: dto.mailDomain,
        mailBaseAddress: dto.mailBaseAddress || 'inbox',
        isActive: isFirstProfile,
        lastUsedAt: isFirstProfile ? new Date() : null,
      },
    });

    if (isFirstProfile) {
      this.eventEmitter.emit('profile.switched');
    }

    return this.excludePassword(profile);
  }

  async update(id: string, dto: UpdateProfileDto) {
    const existing = await this.prisma.imapProfile.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Profile not found');

    if (dto.name && dto.name !== existing.name) {
      const nameConflict = await this.prisma.imapProfile.findUnique({ where: { name: dto.name } });
      if (nameConflict) throw new BadRequestException('Profile name already exists');
    }

    const suppliedPassword =
      dto.imapPassword && dto.imapPassword !== MASKED_PASSWORD ? dto.imapPassword : undefined;
    const currentPassword = await this.credentialBridge.getPassword(existing.credentialKey);
    const passToTest = suppliedPassword ?? currentPassword;

    const isConnectionSettingChanged =
      (dto.imapHost && dto.imapHost !== existing.imapHost) ||
      (dto.imapPort !== undefined && dto.imapPort !== existing.imapPort) ||
      (dto.imapUser && dto.imapUser !== existing.imapUser) ||
      (dto.imapTls !== undefined && dto.imapTls !== existing.imapTls) ||
      Boolean(suppliedPassword);

    if (isConnectionSettingChanged) {
      if (!passToTest) {
        throw new BadRequestException('Password is required to update connection settings');
      }

      await this.assertConnectionWorks({
        host: dto.imapHost || existing.imapHost,
        port: dto.imapPort ?? existing.imapPort,
        secure: dto.imapTls !== undefined ? dto.imapTls : existing.imapTls,
        user: dto.imapUser || existing.imapUser,
        pass: passToTest,
      });
    }

    const dataToSave: Record<string, unknown> = { ...dto };
    delete dataToSave.imapPassword;

    if (suppliedPassword) {
      dataToSave.credentialKey = await this.credentialBridge.savePassword(
        suppliedPassword,
        existing.credentialKey,
      );
    }

    const updated = await this.prisma.imapProfile.update({
      where: { id },
      data: dataToSave,
    });

    if (existing.isActive) {
      this.eventEmitter.emit('profile.switched');
    }

    return this.excludePassword(updated);
  }

  async remove(id: string) {
    const existing = await this.prisma.imapProfile.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Profile not found');

    if (existing.isActive) {
      const activeCount = await this.prisma.imapProfile.count({ where: { isActive: true } });
      const totalCount = await this.prisma.imapProfile.count();
      if (!(activeCount === 1 && totalCount === 1)) {
        throw new BadRequestException(
          'Cannot delete the currently active profile. Please switch to another profile first.',
        );
      }
    }

    await this.credentialBridge.deletePassword(existing.credentialKey);
    await this.prisma.imapProfile.delete({ where: { id } });
    return { success: true, message: 'Profile deleted' };
  }

  async activate(id: string) {
    const profile = await this.prisma.imapProfile.findUnique({ where: { id } });
    if (!profile) throw new NotFoundException('Profile not found');

    await this.prisma.imapProfile.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });

    await this.prisma.imapProfile.update({
      where: { id },
      data: { isActive: true, lastUsedAt: new Date() },
    });

    this.eventEmitter.emit('profile.switched');
    this.eventsGateway.server?.emit('profile:switched', { activeProfileId: id });

    return { success: true, activeProfileId: id };
  }

  async exportProfiles() {
    const raw = await this.prisma.imapProfile.findMany();
    return raw.map((profile) => {
      const { credentialKey, id, isActive, createdAt, updatedAt, lastUsedAt, ...exportable } =
        profile;
      return exportable;
    });
  }

  async importProfiles(data: any) {
    if (!Array.isArray(data)) {
      throw new BadRequestException('Import data must be an array of profiles');
    }

    let imported = 0;
    for (const profile of data) {
      if (!profile.name || !profile.imapHost || !profile.imapUser) continue;

      let finalName = profile.name;
      let counter = 1;
      while (await this.prisma.imapProfile.findFirst({ where: { name: finalName } })) {
        counter++;
        finalName = `${profile.name} (${counter})`;
      }

      await this.prisma.imapProfile.create({
        data: {
          name: finalName,
          provider: profile.provider || 'custom',
          imapHost: profile.imapHost,
          imapPort: Number(profile.imapPort) || 993,
          imapUser: profile.imapUser,
          credentialKey: null,
          imapTls: profile.imapTls !== false,
          imapMode: profile.imapMode || 'idle',
          imapPollInterval: Number(profile.imapPollInterval) || 5000,
          mailDomain: profile.mailDomain || '',
          mailBaseAddress: profile.mailBaseAddress || 'inbox',
          isActive: false,
        },
      });
      imported++;
    }

    return { success: true, imported };
  }

  private async assertConnectionWorks(config: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    pass: string;
  }) {
    try {
      await this.imapService.testConnection(config);
    } catch (err: any) {
      this.logger.error(`Connection test failed: ${err.message}`);
      throw new BadRequestException(`IMAP connection failed: ${err.message}`);
    }
  }

  private excludePassword(profile: any) {
    const { credentialKey, ...rest } = profile;
    return {
      ...rest,
      credentialKey,
      imapPassword: MASKED_PASSWORD,
    };
  }
}
