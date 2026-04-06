import { Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { EmailsService } from './emails.service';

@Controller('emails')
export class EmailsController {
  constructor(private readonly emailsService: EmailsService) {}

  @Get('search')
  search(@Query('q') query: string) {
    return this.emailsService.search(query);
  }

  @Patch('read-all')
  markAllAsRead() {
    return this.emailsService.markAllAsRead();
  }

  @Patch('thread/:threadId/read')
  markThreadAsRead(@Param('threadId') threadId: string) {
    return this.emailsService.markThreadAsRead(threadId);
  }

  @Patch(':id/read')
  markAsRead(@Param('id') id: string) {
    return this.emailsService.markAsRead(id);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.emailsService.findById(id);
  }
}
