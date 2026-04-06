import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  private async getActiveProfileId() {
    const profile = await this.prisma.imapProfile.findFirst({ where: { isActive: true } });
    if (!profile) throw new BadRequestException('No active profile found');
    return profile.id;
  }

  async findAll() {
    const profileId = await this.getActiveProfileId();
    const categories = await this.prisma.category.findMany({
      where: { profileId },
      orderBy: { createdAt: 'asc' },
      include: {
        _count: { select: { threads: true } },
      },
    });
    
    return categories.map((c) => ({
      id: c.id,
      name: c.name,
      color: c.color,
      threadCount: c._count.threads,
    }));
  }

  async create(data: { name: string; color?: string }) {
    const profileId = await this.getActiveProfileId();
    const category = await this.prisma.category.create({
      data: {
        name: data.name,
        color: data.color || '#60A5FA',
        profileId,
      },
    });
    this.eventsGateway.server.emit('category:updated');
    return category;
  }

  async update(id: string, data: { name?: string; color?: string }) {
    const profileId = await this.getActiveProfileId();
    const category = await this.prisma.category.update({
      where: { id, profileId }, // Implicit profile bound ensuring update is within current profile
      data,
    });
    this.eventsGateway.server.emit('category:updated');
    return category;
  }

  async delete(id: string) {
    const profileId = await this.getActiveProfileId();
    await this.prisma.category.delete({ where: { id, profileId } });
    this.eventsGateway.server.emit('category:updated');
    return { success: true };
  }

  async assignThreads(categoryId: string, threadIds: string[]) {
    const profileId = await this.getActiveProfileId();
    // Verify category belongs to active profile
    const cat = await this.prisma.category.findUnique({ where: { id: categoryId } });
    if (!cat || cat.profileId !== profileId) throw new NotFoundException('Category not found');

    await this.prisma.thread.updateMany({
      where: { id: { in: threadIds }, profileId }, // Only update threads in active profile
      data: { categoryId },
    });
    this.eventsGateway.server.emit('thread:updated');
    return { success: true };
  }

  async unassignThread(categoryId: string, threadId: string) {
    const profileId = await this.getActiveProfileId();
    // Only update within the current profile
    await this.prisma.thread.updateMany({
      where: { id: threadId, categoryId, profileId },
      data: { categoryId: null },
    });
    this.eventsGateway.server.emit('thread:updated');
    return { success: true };
  }
}
