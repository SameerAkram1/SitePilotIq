import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { TenantGuard } from '../guards/tenant.guard';

export const Auth = () => UseGuards(JwtAuthGuard, TenantGuard);
