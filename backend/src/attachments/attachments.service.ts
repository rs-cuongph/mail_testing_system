import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { ExtractedAttachment } from '../imap/mail-parser.service';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AttachmentsService {
  private readonly logger = new Logger(AttachmentsService.name);
  private readonly storageDir: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.storageDir = this.config.get(
      'ATTACHMENT_STORAGE_DIR',
      './uploads/attachments',
    );
  }

  async save(attachment: ExtractedAttachment, emailId: string) {
    await fs.mkdir(this.storageDir, { recursive: true });
    const filename = `${uuidv4()}-${attachment.filename}`;
    const storagePath = path.join(this.storageDir, filename);
    await fs.writeFile(storagePath, attachment.content);

    return this.prisma.attachment.create({
      data: {
        filename: attachment.filename,
        contentType: attachment.contentType,
        size: attachment.size,
        storagePath,
        emailId,
      },
    });
  }

  async findById(id: string) {
    return this.prisma.attachment.findUnique({ where: { id } });
  }
}
