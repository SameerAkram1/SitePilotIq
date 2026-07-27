import { Module } from '@nestjs/common';
import { IpcController } from './ipc.controller';
import { IpcService } from './ipc.service';
import { I18nModule } from '../i18n/i18n.module';
import { EmailModule } from '../email/email.module';
import { MeasurementBookModule } from '../measurement-book/measurement-book.module';
import { SitesModule } from '../sites/sites.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [I18nModule, EmailModule, MeasurementBookModule, SitesModule, NotificationsModule],
  controllers: [IpcController],
  providers: [IpcService],
  exports: [IpcService],
})
export class IpcModule {}
