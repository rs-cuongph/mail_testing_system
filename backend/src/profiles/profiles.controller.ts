import { Controller, Get, Post, Body, Patch, Param, Delete, Logger, Req } from '@nestjs/common';
import { ProfilesService } from './profiles.service';
import { ActivateProfileDto, CreateProfileDto, UpdateProfileDto } from './dto/profile.dto';

@Controller('profiles')
export class ProfilesController {
  private readonly logger = new Logger(ProfilesController.name);

  constructor(private readonly profilesService: ProfilesService) {}

  @Post()
  create(@Body() createProfileDto: CreateProfileDto) {
    return this.profilesService.create(createProfileDto);
  }

  @Get()
  findAll() {
    return this.profilesService.findAll();
  }

  @Get('active')
  findActive() {
    return this.profilesService.findActive();
  }

  @Get('export')
  exportProfiles() {
    return this.profilesService.exportProfiles();
  }

  @Post('import')
  importProfiles(@Req() req: any) {
    return this.profilesService.importProfiles(req.body);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.profilesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateProfileDto: UpdateProfileDto) {
    return this.profilesService.update(id, updateProfileDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.profilesService.remove(id);
  }

  @Post(':id/activate')
  activate(@Param('id') id: string, @Body() dto: ActivateProfileDto) {
    return this.profilesService.activate(id, dto.imapPassword);
  }
}
