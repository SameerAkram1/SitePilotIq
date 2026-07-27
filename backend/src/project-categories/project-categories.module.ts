import { Module } from '@nestjs/common';
import { ProjectCategoriesController } from './project-categories.controller';
import { ProjectCategoriesService } from './project-categories.service';
import { I18nModule } from '../i18n/i18n.module';

@Module({
  imports: [I18nModule],
  controllers: [ProjectCategoriesController],
  providers: [ProjectCategoriesService],
  exports: [ProjectCategoriesService],
})
export class ProjectCategoriesModule {}
