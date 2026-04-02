import { Controller, Delete, Get, Param } from '@nestjs/common';
import { ThreadsService } from './threads.service';

@Controller('threads')
export class ThreadsController {
  constructor(private readonly threadsService: ThreadsService) {}

  @Get()
  findAll() {
    return this.threadsService.findAll();
  }

  @Get(':tag')
  findByTag(@Param('tag') tag: string) {
    return this.threadsService.findByTag(tag);
  }

  @Delete()
  deleteAll() {
    return this.threadsService.deleteAll();
  }

  @Delete(':tag')
  deleteByTag(@Param('tag') tag: string) {
    return this.threadsService.deleteByTag(tag);
  }
}
