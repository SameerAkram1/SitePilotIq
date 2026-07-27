import { Module } from '@nestjs/common';
import { VariationOrderController } from './variation-order.controller';
import { VariationOrderService } from './variation-order.service';
import { I18nModule } from '../i18n/i18n.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [I18nModule, NotificationsModule],
  controllers: [VariationOrderController],
  providers: [VariationOrderService],
  exports: [VariationOrderService],
})
export class VariationOrderModule {}
