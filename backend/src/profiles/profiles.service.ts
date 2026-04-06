import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProfileDto, UpdateProfileDto } from './dto/profile.dto';
import { encrypt, decrypt } from '../utils/crypto.util';
import { ImapService } from '../imap/imap.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventsGateway } from '../events/events.gateway';

@Injectable()
export class ProfilesService {
  private readonly logger = new Logger(ProfilesService.name);

  constructor(
    private prisma: PrismaService,
    private imapService: ImapService,
    private eventEmitter: EventEmitter2,
    private eventsGateway: EventsGateway,
  ) {}

  async findAll() {
    const profiles = await this.prisma.imapProfile.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return profiles.map(p => this.excludePassword(p));
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
    return decrypt(profile.imapPassword);
  }

  async create(dto: CreateProfileDto) {
    // Check name collision
    const existing = await this.prisma.imapProfile.findUnique({ where: { name: dto.name } });
    if (existing) {
      throw new BadRequestException('Profile name already exists');
    }

    if (!dto.imapPassword) {
      throw new BadRequestException('Password is required for new profiles');
    }

    // Test connection
    try {
      await this.imapService.testConnection({
        host: dto.imapHost,
        port: dto.imapPort || 993,
        secure: dto.imapTls !== false,
        user: dto.imapUser,
        pass: dto.imapPassword,
      });
    } catch (err: any) {
      this.logger.error(`Connection test failed: ${err.message}`);
      throw new BadRequestException(`IMAP connection failed: ${err.message}`);
    }

    const isFirstProfile = (await this.prisma.imapProfile.count()) === 0;

    const profile = await this.prisma.imapProfile.create({
      data: {
        ...dto,
        provider: dto.provider || 'custom',
        imapPassword: encrypt(dto.imapPassword),
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

    const passToTest = dto.imapPassword && dto.imapPassword !== '••••••••' ? dto.imapPassword : decrypt(existing.imapPassword);

    const isConnectionSettingChanged = 
      (dto.imapHost && dto.imapHost !== existing.imapHost) ||
      (dto.imapPort !== undefined && dto.imapPort !== existing.imapPort) ||
      (dto.imapUser && dto.imapUser !== existing.imapUser) ||
      (dto.imapTls !== undefined && dto.imapTls !== existing.imapTls) ||
      (dto.imapPassword && dto.imapPassword !== '••••••••');

    if (isConnectionSettingChanged && passToTest) {
      // Test connection
      try {
        await this.imapService.testConnection({
          host: dto.imapHost || existing.imapHost,
          port: dto.imapPort ?? existing.imapPort,
          secure: (dto.imapTls !== undefined ? dto.imapTls : existing.imapTls),
          user: dto.imapUser || existing.imapUser,
          pass: passToTest,
        });
      } catch (err: any) {
        this.logger.error(`Connection test failed: ${err.message}`);
        throw new BadRequestException(`IMAP connection failed: ${err.message}`);
      }
    }

    const dataToSave: any = { ...dto };
    if (!dto.imapPassword || dto.imapPassword === '••••••••') {
      delete dataToSave.imapPassword;
    } else {
      dataToSave.imapPassword = encrypt(dto.imapPassword);
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
      if (activeCount === 1 && totalCount === 1) {
        // Just delete if it's the absolute last one, but we must handle no-profiles in UI
      } else if (existing.isActive) {
        throw new BadRequestException('Cannot delete the currently active profile. Please switch to another profile first.');
      }
    }

    await this.prisma.imapProfile.delete({ where: { id } });
    return { success: true, message: 'Profile deleted' };
  }

  async activate(id: string) {
    const profile = await this.prisma.imapProfile.findUnique({ where: { id } });
    if (!profile) throw new NotFoundException('Profile not found');

    // Turn off currently active
    await this.prisma.imapProfile.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });

    // Make new one active
    await this.prisma.imapProfile.update({
      where: { id },
      data: { isActive: true, lastUsedAt: new Date() },
    });

    // Notify backend and frontend about profile switch
    this.eventEmitter.emit('profile.switched');
    this.eventsGateway.server?.emit('profile:switched', { activeProfileId: id });

    return { success: true, activeProfileId: id };
  }

  async exportProfiles() {
    const raw = await this.prisma.imapProfile.findMany();
    return raw.map(p => {
      const { imapPassword, id, isActive, createdAt, updatedAt, lastUsedAt, ...exportable } = p;
      return exportable;
    });
  }

  async importProfiles(data: any) {
    if (!Array.isArray(data)) {
      throw new BadRequestException('Import data must be an array of profiles');
    }
    
    let imported = 0;
    for (const p of data) {
      if (!p.name || !p.imapHost || !p.imapUser) continue;
      
      let finalName = p.name;
      let counter = 1;
      while (await this.prisma.imapProfile.findFirst({ where: { name: finalName } })) {
        counter++;
        finalName = `${p.name} (${counter})`;
      }

      const payload = {
        name: finalName,
        provider: p.provider || 'custom',
        imapHost: p.imapHost,
        imapPort: Number(p.imapPort) || 993,
        imapUser: p.imapUser,
        imapPassword: '', // Password must be set separately
        // password is omitted, must be re-entered by user via edit
        imapTls: p.imapTls !== false,
        imapMode: p.imapMode || 'idle',
        imapPollInterval: Number(p.imapPollInterval) || 5000,
        mailDomain: p.mailDomain || '',
        mailBaseAddress: p.mailBaseAddress || 'inbox',
        isActive: false // Never active on import
      };
      
      await this.prisma.imapProfile.create({ data: payload });
      imported++;
    }
    
    return { success: true, imported };
  }

  private excludePassword(profile: any) {
    const { imapPassword, ...rest } = profile;
    return { ...rest, imapPassword: '••••••••' };
  }
}
