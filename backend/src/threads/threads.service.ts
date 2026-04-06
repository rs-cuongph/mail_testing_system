import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ThreadsService {
  constructor(private readonly prisma: PrismaService) {}

  private async getActiveProfileId() {
    const profile = await this.prisma.imapProfile.findFirst({ where: { isActive: true } });
    if (!profile) throw new BadRequestException('No active profile found');
    return profile.id;
  }

  async findAll() {
    const profileId = await this.getActiveProfileId();
    const threads = await this.prisma.thread.findMany({
      where: { profileId },
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
    const profileId = await this.getActiveProfileId();
    const thread = await this.prisma.thread.findUnique({
      where: { profileId_tag: { profileId, tag } },
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
        categoryId: thread.categoryId,
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
    profileId?: string; // allow overriding if known
  }): Promise<{ thread: any; isNew: boolean }> {
    const profileId = data.profileId || await this.getActiveProfileId();
    
    const existing = await this.prisma.thread.findUnique({
      where: { profileId_tag: { profileId, tag: data.tag } },
    });
    if (existing) return { thread: existing, isNew: false };

    const thread = await this.prisma.thread.create({ 
      data: {
        ...data,
        profileId,
      } 
    });
    return { thread, isNew: true };
  }

  async deleteByTag(tag: string) {
    const profileId = await this.getActiveProfileId();
    const thread = await this.prisma.thread.findUnique({ where: { profileId_tag: { profileId, tag } } });
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

    // Delete implies cascading or we manually delete attachments -> emails -> thread
    // Assuming cascading is on, but we can explicitly call thread.delete.
    await this.prisma.thread.delete({ where: { profileId_tag: { profileId, tag } } });
    
    return {
      message: `Thread '${thread.fullAddress}' deleted`,
      deletedEmails: emailCount,
      deletedAttachments: attachmentCount,
    };
  }

  async deleteAll() {
    const profileId = await this.getActiveProfileId();
    
    const threads = await this.prisma.thread.findMany({ where: { profileId }, select: { id: true } });
    const threadIds = threads.map(t => t.id);

    if (threadIds.length === 0) {
      return { message: 'All data cleared', deletedThreads: 0, deletedEmails: 0, deletedAttachments: 0 };
    }

    const emails = await this.prisma.email.findMany({ where: { threadId: { in: threadIds } }, select: { id: true } });
    const emailIds = emails.map(e => e.id);

    const attachmentCount = await this.prisma.attachment.count({ where: { emailId: { in: emailIds } } });
    
    const [threadCount, emailCount, attDelCount] =
      await this.prisma.$transaction([
        this.prisma.thread.count({ where: { profileId } }),
        this.prisma.email.count({ where: { threadId: { in: threadIds } } }),
        this.prisma.attachment.deleteMany({ where: { emailId: { in: emailIds } } }),
      ]);
      
    await this.prisma.email.deleteMany({ where: { threadId: { in: threadIds } } });
    await this.prisma.thread.deleteMany({ where: { profileId } });
    
    return {
      message: 'All data cleared',
      deletedThreads: threadCount,
      deletedEmails: emailCount,
      deletedAttachments: attDelCount.count,
    };
  }
}
