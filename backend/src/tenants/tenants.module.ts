import { Module } from '@nestjs/common';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';
import { EmailModule } from '../email/email.module';
import { I18nModule } from '../i18n/i18n.module';

@Module({
  imports: [EmailModule, I18nModule],
  controllers: [TenantsController],
  providers: [TenantsService],
  exports: [TenantsService],
})
export class TenantsModule {}
