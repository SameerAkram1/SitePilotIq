import { Module } from '@nestjs/common';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { MilestonesController } from './milestones.controller';
import { MilestonesService } from './milestones.service';
import { I18nModule } from '../i18n/i18n.module';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [I18nModule, UploadModule],
  controllers: [ProjectsController, MilestonesController],
  providers: [ProjectsService, MilestonesService],
  exports: [ProjectsService, MilestonesService],
})
export class ProjectsModule {}
