import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Locale } from '../common/decorators/locale.decorator';
import { ProjectsService } from './projects.service';
import {
  CreateProjectDto,
  UpdateProjectDto,
  QueryProjectsDto,
} from './dto/project.dto';
import { UserRole } from '@prisma/client';

@Controller('projects')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER)
  create(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateProjectDto,
    @Locale() locale: string,
  ) {
    return this.projectsService.create(tenantId, dto, userId, locale);
  }

  @Get()
  findAll(
    @CurrentUser('tenantId') tenantId: string,
    @Query() filters: QueryProjectsDto,
    @Locale() locale: string,
  ) {
    return this.projectsService.findAll(tenantId, filters);
  }

  @Get(':id')
  findById(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @Locale() locale: string,
  ) {
    return this.projectsService.findById(tenantId, id, locale);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER)
  update(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
    @Locale() locale: string,
  ) {
    return this.projectsService.update(tenantId, id, dto, { id: userId, role }, locale);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  disable(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Locale() locale: string,
  ) {
    return this.projectsService.disable(tenantId, id, userId, locale);
  }

  @Post(':id/attachments')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }))
  uploadAttachment(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Locale() locale: string,
    @Body('description') description?: string,
  ) {
    return this.projectsService.uploadAttachment(tenantId, id, file, userId, locale, description);
  }

  @Patch(':id/attachments/:attId')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER)
  updateAttachment(
    @CurrentUser('tenantId') tenantId: string,
    @Param('attId') attId: string,
    @Body() body: { description?: string },
    @Locale() locale: string,
  ) {
    return this.projectsService.updateAttachment(tenantId, attId, body, locale);
  }

  @Get(':id/attachments/:attId/download')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER)
  getAttachmentSignedUrl(
    @CurrentUser('tenantId') tenantId: string,
    @Param('attId') attId: string,
    @Locale() locale: string,
  ) {
    return this.projectsService.getAttachmentSignedUrl(tenantId, attId, locale);
  }

  @Delete(':id/attachments/:attId')
  @Roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER)
  deleteAttachment(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Param('id') id: string,
    @Param('attId') attId: string,
    @Locale() locale: string,
  ) {
    return this.projectsService.deleteAttachment(tenantId, attId, {
      id: userId,
      role,
    }, locale);
  }
}
