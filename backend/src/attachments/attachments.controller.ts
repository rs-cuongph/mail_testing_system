import { Controller, Get, NotFoundException, Param, Res } from '@nestjs/common';
import { Response } from 'express';
import { AttachmentsService } from './attachments.service';
import * as fs from 'fs';

@Controller('attachments')
export class AttachmentsController {
  constructor(private readonly attachmentsService: AttachmentsService) {}

  @Get(':id/download')
  async download(@Param('id') id: string, @Res() res: Response) {
    const attachment = await this.attachmentsService.findById(id);
    if (!attachment) throw new NotFoundException('Attachment not found');

    res.set({
      'Content-Type': attachment.contentType,
      'Content-Disposition': `attachment; filename="${attachment.filename}"`,
      'Content-Length': attachment.size,
    });

    fs.createReadStream(attachment.storagePath).pipe(res);
  }
}
