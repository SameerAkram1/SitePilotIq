import { Module } from '@nestjs/common';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { I18nModule } from '../i18n/i18n.module';
import { SitesModule } from '../sites/sites.module';

@Module({
  imports: [I18nModule, SitesModule],
  controllers: [AttendanceController],
  providers: [AttendanceService],
  exports: [AttendanceService],
})
export class AttendanceModule {}
