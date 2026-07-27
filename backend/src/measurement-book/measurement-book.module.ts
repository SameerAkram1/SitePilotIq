import { Module } from '@nestjs/common';
import { MeasurementBookController } from './measurement-book.controller';
import { MeasurementBookService } from './measurement-book.service';
import { I18nModule } from '../i18n/i18n.module';

@Module({
  imports: [I18nModule],
  controllers: [MeasurementBookController],
  providers: [MeasurementBookService],
  exports: [MeasurementBookService],
})
export class MeasurementBookModule {}
