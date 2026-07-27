import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TenantsModule } from './tenants/tenants.module';
import { CompanySettingsModule } from './company-settings/company-settings.module';
import { UploadModule } from './upload/upload.module';
import { EmailModule } from './email/email.module';
import { I18nModule } from './i18n/i18n.module';
import { SuperAdminModule } from './super-admin/super-admin.module';
import { ProjectCategoriesModule } from './project-categories/project-categories.module';
import { PartnersModule } from './partners/partners.module';
import { ProjectsModule } from './projects/projects.module';
import { SitesModule } from './sites/sites.module';
import { AssignmentsModule } from './assignments/assignments.module';
import { AttendanceModule } from './attendance/attendance.module';
import { DepartmentsModule } from './departments/departments.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { BoqModule } from './boq/boq.module';
import { MeasurementBookModule } from './measurement-book/measurement-book.module';
import { IpcModule } from './ipc/ipc.module';
import { VariationOrderModule } from './variation-orders/variation-order.module';
import { ClientsModule } from './clients/clients.module';
import { NotificationsModule } from './notifications/notifications.module';
import { CalendarModule } from './calendar/calendar.module';
import { ReportsModule } from './reports/reports.module';
import { HealthController } from './common/controllers/health.controller';
import { SecurityMiddleware } from './common/middleware/security.middleware';
import { LocaleMiddleware } from './common/middleware/locale.middleware';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    UsersModule,
    TenantsModule,
    CompanySettingsModule,
    UploadModule,
    EmailModule,
    I18nModule,
    SuperAdminModule,
    ProjectCategoriesModule,
    PartnersModule,
    ProjectsModule,
    SitesModule,
    AssignmentsModule,
    AttendanceModule,
    DepartmentsModule,
    DashboardModule,
    BoqModule,
    MeasurementBookModule,
    IpcModule,
    VariationOrderModule,
    ClientsModule,
    NotificationsModule,
    CalendarModule,
    ReportsModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(SecurityMiddleware, LocaleMiddleware)
      .forRoutes('*');
  }
}
