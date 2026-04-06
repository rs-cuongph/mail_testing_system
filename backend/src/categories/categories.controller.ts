import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { CategoriesService } from './categories.service';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  findAll() {
    return this.categoriesService.findAll();
  }

  @Post()
  create(@Body() body: { name: string; color?: string }) {
    return this.categoriesService.create(body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: { name?: string; color?: string }) {
    return this.categoriesService.update(id, body);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.categoriesService.delete(id);
  }

  @Post(':id/threads')
  assignThreads(@Param('id') id: string, @Body() body: { threadIds: string[] }) {
    return this.categoriesService.assignThreads(id, body.threadIds);
  }

  @Delete(':id/threads/:threadId')
  unassignThread(@Param('id') categoryId: string, @Param('threadId') threadId: string) {
    return this.categoriesService.unassignThread(categoryId, threadId);
  }
}
