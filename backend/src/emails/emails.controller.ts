import { Controller, Get, Param } from '@nestjs/common';
import { EmailsService } from './emails.service';

@Controller('emails')
export class EmailsController {
  constructor(private readonly emailsService: EmailsService) {}

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.emailsService.findById(id);
  }
}
