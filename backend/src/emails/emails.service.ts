import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';

@Injectable()
export class EmailsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  private async getActiveProfileId() {
    const profile = await this.prisma.imapProfile.findFirst({ where: { isActive: true } });
    if (!profile) throw new BadRequestException('No active profile found');
    return profile.id;
  }

  async findByMessageId(messageId: string) {
    const profileId = await this.getActiveProfileId();
    return this.prisma.email.findFirst({
      where: { 
        messageId,
        thread: { profileId }
      }
    });
  }

  async findById(id: string) {
    const profileId = await this.getActiveProfileId();
    const email = await this.prisma.email.findFirst({
      where: { 
        id,
        thread: { profileId }
      },
      include: {
        attachments: {
          select: { id: true, filename: true, contentType: true, size: true },
        },
      },
    });
    if (!email) throw new NotFoundException('Email not found');
    return email;
  }

  async create(data: {
    messageId: string;
    fromEmail: string;
    toEmail: string;
    subject: string;
    textBody: string | null;
    htmlBody: string | null;
    threadId: string;
    receivedAt: Date;
    rawHeaders: Record<string, string>;
  }) {
    return this.prisma.email.create({ data });
  }

  async markAsRead(id: string) {
    const profileId = await this.getActiveProfileId();
    // Validate it belongs to active profile
    const existing = await this.prisma.email.findFirst({ where: { id, thread: { profileId } }});
    if (!existing) throw new NotFoundException('Email not found');
    
    const email = await this.prisma.email.update({
      where: { id },
      data: { isRead: true },
      include: { thread: true },
    });
    this.eventsGateway.server.emit('email:read', { emailId: id, threadTag: email.thread.tag });
    return email;
  }

  async markThreadAsRead(tag: string) {
    const profileId = await this.getActiveProfileId();
    const thread = await this.prisma.thread.findUnique({ where: { profileId_tag: { profileId, tag } } });
    if (!thread) throw new NotFoundException('Thread not found');

    await this.prisma.email.updateMany({
      where: { threadId: thread.id, isRead: false },
      data: { isRead: true },
    });
    
    this.eventsGateway.server.emit('thread:read', { threadTag: tag });
    return { success: true };
  }

  async markAllAsRead() {
    const profileId = await this.getActiveProfileId();
    
    // Find all thread IDs for current profile
    const threads = await this.prisma.thread.findMany({ where: { profileId }, select: { id: true }});
    const threadIds = threads.map(t => t.id);

    if (threadIds.length > 0) {
      await this.prisma.email.updateMany({
        where: { threadId: { in: threadIds }, isRead: false },
        data: { isRead: true },
      });
    }
    
    this.eventsGateway.server.emit('all:read', {});
    return { success: true };
  }

  async search(query: string) {
    if (!query || query.trim() === '') return [];
    
    const profileId = await this.getActiveProfileId();
    
    // PostgreSQL Full-Text Search
    const results = await this.prisma.$queryRaw`
      SELECT e.id, e."messageId", e."fromEmail", e."toEmail", e.subject, e."receivedAt", 
             e."textBody", e."isRead", t.tag as "threadTag", t."fullAddress" as "threadFullAddress"
      FROM "Email" e
      JOIN "Thread" t ON e."threadId" = t.id
      WHERE t."profileId" = ${profileId}
        AND to_tsvector('simple', coalesce(e.subject,'') || ' ' || coalesce(e."textBody",'') || ' ' || e."fromEmail")
        @@ plainto_tsquery('simple', ${query})
      ORDER BY e."receivedAt" DESC
      LIMIT 50
    `;
    return results;
  }
}
