import { Module } from '@nestjs/common';
import { BoqController } from './boq.controller';
import { BoqService } from './boq.service';
import { BoqSectionController } from './boq-section.controller';
import { BoqSectionService } from './boq-section.service';
import { I18nModule } from '../i18n/i18n.module';

@Module({
  imports: [I18nModule],
  controllers: [BoqController, BoqSectionController],
  providers: [BoqService, BoqSectionService],
  exports: [BoqService, BoqSectionService],
})
export class BoqModule {}
