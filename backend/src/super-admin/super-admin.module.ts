import { Module } from '@nestjs/common';
import { SuperAdminController } from './super-admin.controller';
import { SuperAdminService } from './super-admin.service';
import { ConfigService } from '@nestjs/config';

@Module({
  controllers: [SuperAdminController],
  providers: [SuperAdminService, ConfigService],
  exports: [SuperAdminService],
})
export class SuperAdminModule {}
