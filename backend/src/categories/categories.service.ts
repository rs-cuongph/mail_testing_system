import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  async findAll() {
    const categories = await this.prisma.category.findMany({
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
    const category = await this.prisma.category.create({
      data: {
        name: data.name,
        color: data.color || '#60A5FA',
      },
    });
    this.eventsGateway.server.emit('category:updated');
    return category;
  }

  async update(id: string, data: { name?: string; color?: string }) {
    const category = await this.prisma.category.update({
      where: { id },
      data,
    });
    this.eventsGateway.server.emit('category:updated');
    return category;
  }

  async delete(id: string) {
    await this.prisma.category.delete({ where: { id } });
    this.eventsGateway.server.emit('category:updated');
    return { success: true };
  }

  async assignThreads(categoryId: string, threadIds: string[]) {
    await this.prisma.thread.updateMany({
      where: { id: { in: threadIds } },
      data: { categoryId },
    });
    this.eventsGateway.server.emit('thread:updated');
    return { success: true };
  }

  async unassignThread(categoryId: string, threadId: string) {
    await this.prisma.thread.update({
      where: { id: threadId, categoryId },
      data: { categoryId: null },
    });
    this.eventsGateway.server.emit('thread:updated');
    return { success: true };
  }
}
