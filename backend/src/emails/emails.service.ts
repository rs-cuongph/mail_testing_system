import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EmailsService {
  constructor(private readonly prisma: PrismaService) {}

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
}
