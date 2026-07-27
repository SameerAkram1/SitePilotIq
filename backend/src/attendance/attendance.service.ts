import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { I18nService } from '../i18n/i18n.service';
import { CheckInDto, CheckOutDto, CreateAttendanceDto, UpdateAttendanceDto } from './dto/attendance.dto';
import { isWithinRadius } from '../common/utils/haversine.util';
import { QrCodeService } from '../sites/qr-code.service';
import { UserRole } from '@prisma/client';
import { getTodayUtc, parseDateAsUtc, toUtcMidnight } from '../common/utils/date-utils';

@Injectable()
export class AttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly i18n: I18nService,
    private readonly qrCodeService: QrCodeService,
  ) {}

  async checkIn(userId: string, tenantId: string, dto: CheckInDto, locale: string) {
    const user = await this.findUserById(userId, tenantId);
    if (!user) {
      throw new ForbiddenException(
        this.i18n.translate('attendance.errors.noEmployeeRecord', {}, locale),
      );
    }

    if (
      user.role !== UserRole.WORKER &&
      user.role !== UserRole.SITE_MANAGER
    ) {
      throw new ForbiddenException(
        this.i18n.translate('attendance.errors.invalidRole', {}, locale),
      );
    }

    if (user.status !== 'ACTIVE') {
      throw new ForbiddenException(this.i18n.translate('attendance.errors.employeeNotActive', {}, locale));
    }

    let siteId: string;

    if (dto.qrPayload) {
      const verified = await this.qrCodeService.validateQrPayload(dto.qrPayload);
      if (!verified) {
        throw new ForbiddenException(
          this.i18n.translate('attendance.errors.invalidQr', {}, locale),
        );
      }
      if (verified.tenantId !== tenantId) {
        throw new ForbiddenException(
          this.i18n.translate('attendance.errors.invalidQr', {}, locale),
        );
      }
      siteId = verified.siteId;
    } else if (dto.siteId) {
      siteId = dto.siteId;
    } else {
      throw new BadRequestException(
        this.i18n.translate('attendance.errors.siteIdOrQrRequired', {}, locale),
      );
    }

    const site = await this.findSite(siteId, tenantId);
    if (!site) {
      throw new NotFoundException(this.i18n.translate('attendance.errors.siteNotFound', {}, locale));
    }

    if (site.status !== 'ACTIVE') {
      throw new BadRequestException(this.i18n.translate('attendance.errors.siteNotActive', {}, locale));
    }

    // Check if worker has an active assignment to this site today
    const today = getTodayUtc();

    const activeAssignment = await this.prisma.workerAssignment.findFirst({
      where: {
        tenantId,
        userId: user.id,
        siteId,
        isDeleted: false,
        status: 'ACTIVE',
        startDate: { lte: today },
        OR: [
          { endDate: null },
          { endDate: { gte: today } },
        ],
      },
    });

    if (!activeAssignment) {
      throw new ForbiddenException(
        this.i18n.translate('attendance.errors.notAssignedToSite', {}, locale),
      );
    }

    if (!site.latitude || !site.longitude) {
      throw new BadRequestException(
        this.i18n.translate('attendance.errors.gpsNotConfigured', {}, locale),
      );
    }

    const locationCheck = isWithinRadius(
      dto.latitude,
      dto.longitude,
      site.latitude,
      site.longitude,
      site.locationRadius,
    );

    const existingAttendance = await this.prisma.attendance.findUnique({
      where: {
        tenantId_siteId_employeeId_attendanceDate: {
          tenantId,
          siteId,
          employeeId: user.id,
          attendanceDate: today,
        },
      },
    });

    if (existingAttendance) {
      throw new BadRequestException(
        this.i18n.translate('attendance.errors.alreadyCheckedIn', {}, locale),
      );
    }

    if (!locationCheck.within) {
      throw new BadRequestException({
        message: this.i18n.translate('attendance.errors.checkInDenied', { distance: Math.round(locationCheck.distance), radius: site.locationRadius }, locale),
        distance: Math.round(locationCheck.distance),
        maxRadius: site.locationRadius,
      });
    }

    const attendance = await this.prisma.attendance.create({
      data: {
        tenantId,
        siteId,
        employeeId: user.id,
        attendanceDate: today,
        checkInLat: dto.latitude,
        checkInLng: dto.longitude,
        checkInLocationValid: locationCheck.within,
        notes: dto.notes,
      },
      include: {
        site: { select: { id: true, name: true, code: true } },
        employee: { select: { id: true, fullName: true, code: true } },
      },
    });

    return attendance;
  }

  async checkOut(userId: string, tenantId: string, dto: CheckOutDto, locale: string) {
    const user = await this.findUserById(userId, tenantId);
    if (!user) {
      throw new ForbiddenException(this.i18n.translate('attendance.errors.noEmployeeRecord', {}, locale));
    }

    const today = getTodayUtc();

    const attendance = await this.prisma.attendance.findFirst({
      where: {
        tenantId,
        employeeId: user.id,
        attendanceDate: today,
        status: 'CHECKED_IN',
      },
      include: {
        site: {
          select: {
            id: true,
            name: true,
            latitude: true,
            longitude: true,
            locationRadius: true,
          },
        },
      },
    });

    if (!attendance) {
      throw new BadRequestException(this.i18n.translate('attendance.errors.noActiveCheckIn', {}, locale));
    }

    if (!attendance.site.latitude || !attendance.site.longitude) {
      throw new BadRequestException(
        this.i18n.translate('attendance.errors.checkOutGpsNotConfigured', {}, locale),
      );
    }

    const locationCheck = isWithinRadius(
      dto.latitude,
      dto.longitude,
      attendance.site.latitude,
      attendance.site.longitude,
      attendance.site.locationRadius,
    );

    const updated = await this.prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        checkOutTime: new Date(),
        checkOutLat: dto.latitude,
        checkOutLng: dto.longitude,
        checkOutLocationValid: locationCheck.within,
        status: 'CHECKED_OUT',
        notes: dto.notes || attendance.notes,
      },
      include: {
        site: { select: { id: true, name: true, code: true } },
        employee: { select: { id: true, fullName: true, code: true } },
      },
    });

    if (!locationCheck.within) {
      return {
        ...updated,
        _warning: this.i18n.translate('attendance.errors.checkOutFlagged', { distance: Math.round(locationCheck.distance), radius: attendance.site.locationRadius }, locale),
      };
    }

    return updated;
  }

  async getTodayAttendance(userId: string, tenantId: string, locale: string) {
    const user = await this.findUserById(userId, tenantId);
    if (!user) {
      throw new ForbiddenException(this.i18n.translate('attendance.errors.noEmployeeRecord', {}, locale));
    }

    const today = getTodayUtc();

    return this.prisma.attendance.findMany({
      where: {
        tenantId,
        employeeId: user.id,
        attendanceDate: today,
      },
      include: {
        site: { select: { id: true, name: true, code: true } },
      },
      orderBy: { checkInTime: 'desc' },
    });
  }

  async getAttendanceHistory(userId: string, tenantId: string, query: {
    siteId?: string;
    employeeId?: string;
    startDate?: string;
    endDate?: string;
  }, locale: string) {
    const user = await this.findUserById(userId, tenantId);
    if (!user) {
      throw new ForbiddenException(this.i18n.translate('attendance.errors.noEmployeeRecord', {}, locale));
    }

    const where: Record<string, unknown> = { tenantId };

    if (query.siteId) where.siteId = query.siteId;

    // Only admins/managers can view other users' records
    const isAdminOrManager = user.role === UserRole.ADMIN || user.role === UserRole.PROJECT_MANAGER || user.role === UserRole.SITE_MANAGER;
    if (query.employeeId && isAdminOrManager) {
      where.employeeId = query.employeeId;
    } else {
      where.employeeId = user.id;
    }

    if (query.startDate || query.endDate) {
      const dateFilter: Record<string, Date> = {};
      if (query.startDate) {
        dateFilter.gte = parseDateAsUtc(query.startDate);
      }
      if (query.endDate) {
        const end = parseDateAsUtc(query.endDate);
        dateFilter.lte = new Date(end.getTime() + 86400000);
      }
      where.attendanceDate = dateFilter;
    }

    return this.prisma.attendance.findMany({
      where,
      include: {
        site: { select: { id: true, name: true, code: true } },
        employee: { select: { id: true, fullName: true, code: true } },
      },
      orderBy: { attendanceDate: 'desc' },
    });
  }

  async getSiteAttendance(userId: string, tenantId: string, siteId: string, query: { startDate?: string; endDate?: string; page?: number; limit?: number }, locale: string) {
    const user = await this.findUserById(userId, tenantId);
    if (!user) {
      throw new ForbiddenException(this.i18n.translate('attendance.errors.noEmployeeRecord', {}, locale));
    }

    if (user.role !== UserRole.ADMIN && user.role !== UserRole.PROJECT_MANAGER && user.role !== UserRole.SITE_MANAGER) {
      throw new ForbiddenException(this.i18n.translate('attendance.errors.invalidRole', {}, locale));
    }

    const site = await this.findSite(siteId, tenantId);
    if (!site) {
      throw new NotFoundException(this.i18n.translate('attendance.errors.siteNotFound', {}, locale));
    }

    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 25));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { tenantId, siteId };

    if (query.startDate || query.endDate) {
      const dateFilter: Record<string, Date> = {};
      if (query.startDate) {
        dateFilter.gte = parseDateAsUtc(query.startDate);
      }
      if (query.endDate) {
        const end = parseDateAsUtc(query.endDate);
        dateFilter.lte = new Date(end.getTime() + 86400000);
      }
      where.attendanceDate = dateFilter;
    }

    const [records, total] = await this.prisma.withRetry(() =>
      Promise.all([
        this.prisma.attendance.findMany({
          where,
          include: {
            site: { select: { id: true, name: true, code: true } },
            employee: { select: { id: true, fullName: true, code: true, email: true } },
          },
          orderBy: { attendanceDate: 'desc' },
          skip,
          take: limit,
        }),
        this.prisma.attendance.count({ where }),
      ]),
    );

    const allRecords = await this.prisma.attendance.findMany({ where, select: { status: true, checkInLocationValid: true, checkInTime: true, checkOutTime: true } });
    const checkedIn = allRecords.filter((r) => r.status === 'CHECKED_IN').length;
    const checkedOut = allRecords.filter((r) => r.status === 'CHECKED_OUT').length;
    const validCheckIns = allRecords.filter((r) => r.checkInLocationValid).length;
    const invalidCheckIns = allRecords.filter((r) => !r.checkInLocationValid).length;
    const uniqueWorkers = new Set(allRecords.map((r) => r.checkInTime ? 'worker' : '')).size;

    // Calculate hours worked for summary
    let totalHours = 0;
    for (const r of allRecords) {
      if (r.checkInTime && r.checkOutTime) {
        totalHours += (new Date(r.checkOutTime).getTime() - new Date(r.checkInTime).getTime()) / 3600000;
      }
    }

    return {
      records,
      summary: {
        total,
        checkedIn,
        checkedOut,
        validCheckIns,
        invalidCheckIns,
        uniqueWorkers: new Set(allRecords.map((r, i) => i)).size,
        totalHours: Math.round(totalHours * 100) / 100,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async createAttendance(userId: string, tenantId: string, dto: CreateAttendanceDto, locale: string) {
    const user = await this.findUserById(userId, tenantId);
    if (!user) {
      throw new ForbiddenException(this.i18n.translate('attendance.errors.noEmployeeRecord', {}, locale));
    }

    if (user.role !== UserRole.ADMIN && user.role !== UserRole.PROJECT_MANAGER && user.role !== UserRole.SITE_MANAGER) {
      throw new ForbiddenException(this.i18n.translate('attendance.errors.invalidRole', {}, locale));
    }

    const site = await this.findSite(dto.siteId, tenantId);
    if (!site) {
      throw new NotFoundException(this.i18n.translate('attendance.errors.siteNotFound', {}, locale));
    }

    const attendanceDate = parseDateAsUtc(dto.attendanceDate);

    // Check for existing record
    const existing = await this.prisma.attendance.findUnique({
      where: {
        tenantId_siteId_employeeId_attendanceDate: {
          tenantId,
          siteId: dto.siteId,
          employeeId: dto.employeeId,
          attendanceDate,
        },
      },
    });

    if (existing) {
      throw new BadRequestException(this.i18n.translate('attendance.errors.alreadyCheckedIn', {}, locale));
    }

    const checkInTime = dto.checkInTime ? new Date(dto.checkInTime) : new Date();
    const isCheckOut = dto.checkOutTime != null;

    return this.prisma.attendance.create({
      data: {
        tenantId,
        siteId: dto.siteId,
        employeeId: dto.employeeId,
        attendanceDate,
        checkInTime,
        checkInLat: dto.checkInLat ?? 0,
        checkInLng: dto.checkInLng ?? 0,
        checkInLocationValid: dto.checkInLat != null && dto.checkInLng != null ? true : false,
        checkOutTime: isCheckOut ? new Date(dto.checkOutTime!) : null,
        checkOutLat: dto.checkOutLat ?? null,
        checkOutLng: dto.checkOutLng ?? null,
        checkOutLocationValid: isCheckOut ? (dto.checkOutLat != null && dto.checkOutLng != null ? true : null) : null,
        status: isCheckOut ? 'CHECKED_OUT' : 'CHECKED_IN',
        notes: dto.notes || null,
      },
      include: {
        site: { select: { id: true, name: true, code: true } },
        employee: { select: { id: true, fullName: true, code: true } },
      },
    });
  }

  async updateAttendance(userId: string, tenantId: string, attendanceId: string, dto: UpdateAttendanceDto, locale: string) {
    const user = await this.findUserById(userId, tenantId);
    if (!user) {
      throw new ForbiddenException(this.i18n.translate('attendance.errors.noEmployeeRecord', {}, locale));
    }

    if (user.role !== UserRole.ADMIN && user.role !== UserRole.PROJECT_MANAGER && user.role !== UserRole.SITE_MANAGER) {
      throw new ForbiddenException(this.i18n.translate('attendance.errors.invalidRole', {}, locale));
    }

    const attendance = await this.prisma.attendance.findFirst({
      where: { id: attendanceId, tenantId },
    });

    if (!attendance) {
      throw new NotFoundException(this.i18n.translate('attendance.errors.siteNotFound', {}, locale));
    }

    const hasCheckOut = dto.checkOutTime != null || attendance.checkOutTime != null;

    return this.prisma.attendance.update({
      where: { id: attendanceId },
      data: {
        ...(dto.attendanceDate && { attendanceDate: parseDateAsUtc(dto.attendanceDate) }),
        ...(dto.checkInTime && { checkInTime: new Date(dto.checkInTime) }),
        ...(dto.checkInLat !== undefined && { checkInLat: dto.checkInLat }),
        ...(dto.checkInLng !== undefined && { checkInLng: dto.checkInLng }),
        ...(dto.checkOutTime && { checkOutTime: new Date(dto.checkOutTime) }),
        ...(dto.checkOutLat !== undefined && { checkOutLat: dto.checkOutLat }),
        ...(dto.checkOutLng !== undefined && { checkOutLng: dto.checkOutLng }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        status: hasCheckOut ? 'CHECKED_OUT' : 'CHECKED_IN',
        checkOutLocationValid: hasCheckOut ? true : attendance.checkOutLocationValid,
      },
      include: {
        site: { select: { id: true, name: true, code: true } },
        employee: { select: { id: true, fullName: true, code: true } },
      },
    });
  }

  async removeAttendance(userId: string, tenantId: string, attendanceId: string, locale: string) {
    const user = await this.findUserById(userId, tenantId);
    if (!user) {
      throw new ForbiddenException(this.i18n.translate('attendance.errors.noEmployeeRecord', {}, locale));
    }

    if (user.role !== UserRole.ADMIN && user.role !== UserRole.PROJECT_MANAGER) {
      throw new ForbiddenException(this.i18n.translate('attendance.errors.invalidRole', {}, locale));
    }

    const attendance = await this.prisma.attendance.findFirst({
      where: { id: attendanceId, tenantId },
    });

    if (!attendance) {
      throw new NotFoundException(this.i18n.translate('attendance.errors.siteNotFound', {}, locale));
    }

    await this.prisma.attendance.delete({ where: { id: attendanceId } });

    return { success: true };
  }

  async exportCsv(userId: string, tenantId: string, query: { siteId?: string; startDate?: string; endDate?: string }) {
    const where: Record<string, unknown> = { tenantId };

    if (query.siteId) where.siteId = query.siteId;

    if (query.startDate || query.endDate) {
      const dateFilter: Record<string, Date> = {};
      if (query.startDate) {
        dateFilter.gte = parseDateAsUtc(query.startDate);
      }
      if (query.endDate) {
        const end = parseDateAsUtc(query.endDate);
        dateFilter.lte = new Date(end.getTime() + 86400000);
      }
      where.attendanceDate = dateFilter;
    }

    const records = await this.prisma.attendance.findMany({
      where,
      include: {
        site: { select: { id: true, name: true, code: true } },
        employee: { select: { id: true, fullName: true, code: true } },
      },
      orderBy: { attendanceDate: 'desc' },
    });

    const headers = ['Date', 'Worker', 'Worker Code', 'Site', 'Site Code', 'Check In', 'Check Out', 'Hours Worked', 'Status', 'Location Valid'];

    const rows = records.map((r) => {
      const checkIn = r.checkInTime ? new Date(r.checkInTime) : null;
      const checkOut = r.checkOutTime ? new Date(r.checkOutTime) : null;
      const hours = checkIn && checkOut ? ((checkOut.getTime() - checkIn.getTime()) / 3600000).toFixed(2) : '';

      return [
        r.attendanceDate ? new Date(r.attendanceDate).toISOString().slice(0, 10) : '',
        r.employee?.fullName || '',
        r.employee?.code || '',
        r.site?.name || '',
        r.site?.code || '',
        checkIn ? checkIn.toISOString().slice(11, 16) : '',
        checkOut ? checkOut.toISOString().slice(11, 16) : '',
        hours,
        r.status,
        r.checkInLocationValid ? 'Yes' : 'No',
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }

  private async findUserById(userId: string, tenantId: string) {
    return this.prisma.user.findFirst({
      where: {
        id: userId,
        tenantId,
      },
    });
  }

  private async findSite(siteId: string, tenantId: string) {
    return this.prisma.site.findFirst({
      where: {
        id: siteId,
        tenantId,
        isDeleted: false,
      },
    });
  }
}
