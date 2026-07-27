import { Module } from '@nestjs/common';
import { CompanySettingsController } from './company-settings.controller';
import { CompanySettingsService } from './company-settings.service';
import { ConfigService } from '@nestjs/config';
import { UploadModule } from '../upload/upload.module';
import { I18nModule } from '../i18n/i18n.module';

@Module({
  imports: [UploadModule, I18nModule],
  controllers: [CompanySettingsController],
  providers: [CompanySettingsService, ConfigService],
  exports: [CompanySettingsService],
})
export class CompanySettingsModule {}
