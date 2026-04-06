import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ThreadsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const threads = await this.prisma.thread.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: { select: { emails: true } },
        category: true,
        emails: {
          orderBy: { receivedAt: 'desc' },
          select: { subject: true, isRead: true },
        },
      },
    });

    return {
      data: threads.map((t) => ({
        id: t.id,
        tag: t.tag,
        fullAddress: t.fullAddress,
        emailCount: t._count.emails,
        unreadCount: t.emails.filter(e => !e.isRead).length,
        latestSubject: t.emails[0]?.subject ?? null,
        category: t.category,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      })),
      total: threads.length,
    };
  }

  async findByTag(tag: string) {
    const thread = await this.prisma.thread.findUnique({
      where: { tag },
      include: {
        category: true,
        emails: {
          orderBy: { receivedAt: 'desc' },
          select: {
            id: true,
            messageId: true,
            fromEmail: true,
            toEmail: true,
            subject: true,
            receivedAt: true,
            isRead: true,
            attachments: { select: { id: true } },
          },
        },
      },
    });

    if (!thread)
      throw new NotFoundException(`Thread with tag '${tag}' not found`);

    return {
      thread: {
        id: thread.id,
        tag: thread.tag,
        fullAddress: thread.fullAddress,
        category: thread.category,
        createdAt: thread.createdAt,
        updatedAt: thread.updatedAt,
      },
      emails: thread.emails.map((e) => ({
        id: e.id,
        messageId: e.messageId,
        fromEmail: e.fromEmail,
        toEmail: e.toEmail,
        subject: e.subject,
        receivedAt: e.receivedAt,
        isRead: e.isRead,
        hasAttachments: e.attachments.length > 0,
        attachmentCount: e.attachments.length,
      })),
      total: thread.emails.length,
    };
  }

  async findOrCreate(data: {
    tag: string;
    baseAddress: string;
    fullAddress: string;
  }): Promise<{ thread: any; isNew: boolean }> {
    const existing = await this.prisma.thread.findUnique({
      where: { tag: data.tag },
    });
    if (existing) return { thread: existing, isNew: false };

    const thread = await this.prisma.thread.create({ data });
    return { thread, isNew: true };
  }

  async deleteByTag(tag: string) {
    const thread = await this.prisma.thread.findUnique({ where: { tag } });
    if (!thread)
      throw new NotFoundException(`Thread with tag '${tag}' not found`);

    const emails = await this.prisma.email.findMany({
      where: { threadId: thread.id },
      include: { attachments: true },
    });
    const emailCount = emails.length;
    const attachmentCount = emails.reduce(
      (n, e) => n + e.attachments.length,
      0,
    );

    await this.prisma.thread.delete({ where: { tag } });
    return {
      message: `Thread '${thread.fullAddress}' deleted`,
      deletedEmails: emailCount,
      deletedAttachments: attachmentCount,
    };
  }

  async deleteAll() {
    const [threadCount, emailCount, attachmentCount] =
      await this.prisma.$transaction([
        this.prisma.thread.count(),
        this.prisma.email.count(),
        this.prisma.attachment.count(),
      ]);
    await this.prisma.attachment.deleteMany();
    await this.prisma.email.deleteMany();
    await this.prisma.thread.deleteMany();
    return {
      message: 'All data cleared',
      deletedThreads: threadCount,
      deletedEmails: emailCount,
      deletedAttachments: attachmentCount,
    };
  }
}
