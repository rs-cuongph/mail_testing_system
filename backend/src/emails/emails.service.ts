import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';

@Injectable()
export class EmailsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  async findByMessageId(messageId: string) {
    return this.prisma.email.findUnique({ where: { messageId } });
  }

  async findById(id: string) {
    const email = await this.prisma.email.findUnique({
      where: { id },
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
    const email = await this.prisma.email.update({
      where: { id },
      data: { isRead: true },
      include: { thread: true },
    });
    this.eventsGateway.server.emit('email:read', { emailId: id, threadTag: email.thread.tag });
    return email;
  }

  async markThreadAsRead(tag: string) {
    const thread = await this.prisma.thread.findUnique({ where: { tag } });
    if (!thread) throw new NotFoundException('Thread not found');

    await this.prisma.email.updateMany({
      where: { threadId: thread.id, isRead: false },
      data: { isRead: true },
    });
    
    this.eventsGateway.server.emit('thread:read', { threadTag: tag });
    return { success: true };
  }

  async markAllAsRead() {
    await this.prisma.email.updateMany({
      where: { isRead: false },
      data: { isRead: true },
    });
    this.eventsGateway.server.emit('all:read', {});
    return { success: true };
  }

  async search(query: string) {
    if (!query || query.trim() === '') return [];
    
    // PostgreSQL Full-Text Search
    const results = await this.prisma.$queryRaw`
      SELECT e.id, e."messageId", e."fromEmail", e."toEmail", e.subject, e."receivedAt", 
             e."textBody", e."isRead", t.tag as "threadTag", t."fullAddress" as "threadFullAddress"
      FROM "Email" e
      JOIN "Thread" t ON e."threadId" = t.id
      WHERE to_tsvector('simple', coalesce(e.subject,'') || ' ' || coalesce(e."textBody",'') || ' ' || e."fromEmail")
        @@ plainto_tsquery('simple', ${query})
      ORDER BY e."receivedAt" DESC
      LIMIT 50
    `;
    return results;
  }
}
