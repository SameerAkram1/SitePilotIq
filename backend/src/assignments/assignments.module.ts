import { Module } from '@nestjs/common';
import { AssignmentsController } from './assignments.controller';
import { AssignmentsService } from './assignments.service';
import { I18nModule } from '../i18n/i18n.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [I18nModule, NotificationsModule],
  controllers: [AssignmentsController],
  providers: [AssignmentsService],
  exports: [AssignmentsService],
})
export class AssignmentsModule {}
