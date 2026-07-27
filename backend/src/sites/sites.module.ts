import { Module } from '@nestjs/common';
import { SitesController } from './sites.controller';
import { SitesService } from './sites.service';
import { SiteLocationsService } from './site-locations.service';
import { SiteAttachmentsController } from './site-attachments.controller';
import { SiteAttachmentsService } from './site-attachments.service';
import { DailyProgressReportsController } from './daily-progress-reports.controller';
import { DailyProgressReportsService } from './daily-progress-reports.service';
import { SitePhotosController } from './site-photos.controller';
import { SitePhotosService } from './site-photos.service';
import { QrCodeService } from './qr-code.service';
import { QrPdfService } from './qr-pdf.service';
import { IpcPdfService } from './ipc-pdf.service';
import { GeocodingService } from '../common/services/geocoding.service';
import { UploadService } from '../upload/upload.service';
import { I18nModule } from '../i18n/i18n.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [I18nModule, NotificationsModule],
  controllers: [
    SitesController,
    SiteAttachmentsController,
    DailyProgressReportsController,
    SitePhotosController,
  ],
  providers: [
    SitesService,
    SiteLocationsService,
    SiteAttachmentsService,
    DailyProgressReportsService,
    SitePhotosService,
    QrCodeService,
    QrPdfService,
    IpcPdfService,
    GeocodingService,
    UploadService,
  ],
  exports: [SitesService, QrCodeService, IpcPdfService, SiteAttachmentsService, DailyProgressReportsService, SitePhotosService],
})
export class SitesModule {}
