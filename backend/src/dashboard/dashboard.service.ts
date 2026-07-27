import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { getTodayUtc } from '../common/utils/date-utils';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(tenantId: string) {
    const today = getTodayUtc();

    const [
      activeProjects,
      totalSites,
      activeSites,
      teamMembers,
      attendanceToday,
      totalClients,
    ] = await this.prisma.withRetry(() =>
      Promise.all([
        this.prisma.project.count({
          where: { tenantId, status: 'ACTIVE', isDeleted: false },
        }),
        this.prisma.site.count({
          where: { tenantId, isDeleted: false },
        }),
        this.prisma.site.count({
          where: { tenantId, status: 'ACTIVE', isDeleted: false },
        }),
        this.prisma.user.count({
          where: { tenantId, status: 'ACTIVE' },
        }),
        this.prisma.attendance.groupBy({
          by: ['status'],
          where: {
            tenantId,
            attendanceDate: today,
          },
          _count: { id: true },
        }),
        this.prisma.client.count({
          where: { tenantId, isDeleted: false },
        }),
      ]),
    );

    const checkedIn =
      attendanceToday.find((a) => a.status === 'CHECKED_IN')?._count.id || 0;
    const checkedOut =
      attendanceToday.find((a) => a.status === 'CHECKED_OUT')?._count.id || 0;

    const offSiteRecords = await this.prisma.withRetry(() =>
      this.prisma.attendance.count({
        where: {
          tenantId,
          attendanceDate: today,
          checkInLocationValid: false,
        },
      }),
    );

    return {
      activeProjects,
      totalSites,
      activeSites,
      teamMembers,
      totalClients,
      attendance: {
        checkedIn,
        checkedOut,
        offSite: offSiteRecords,
        total: checkedIn + checkedOut,
      },
    };
  }

  async getFinancialOverview(tenantId: string) {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [expenseAgg, ipcAgg, thisMonthExpenses] =
      await this.prisma.withRetry(() =>
        Promise.all([
          this.prisma.clientExpense.aggregate({
            where: { tenantId },
            _sum: { totalAmount: true, amount: true, taxAmount: true },
            _count: { id: true },
          }),
          this.prisma.ipcRecord.aggregate({
            where: { tenantId },
            _sum: {
              certifiedNetPayable: true,
              netPayable: true,
              grossClaimed: true,
            },
          }),
          this.prisma.clientExpense.aggregate({
            where: { tenantId, date: { gte: startOfMonth } },
            _sum: { totalAmount: true },
          }),
        ]),
      );

    const ipcPaid = await this.prisma.withRetry(() =>
      this.prisma.ipcRecord.aggregate({
        where: { tenantId, status: 'PAID' },
        _sum: { certifiedNetPayable: true },
      }),
    );

    const outstanding =
      Number(ipcAgg._sum.certifiedNetPayable ?? 0) -
      Number(ipcPaid._sum.certifiedNetPayable ?? 0);

    return {
      totalExpenses: Number(expenseAgg._sum.totalAmount ?? 0),
      totalInvoiced: Number(ipcAgg._sum.netPayable ?? 0),
      totalCertified: Number(ipcAgg._sum.certifiedNetPayable ?? 0),
      totalPaid: Number(ipcPaid._sum.certifiedNetPayable ?? 0),
      outstanding: Math.max(0, outstanding),
      thisMonthExpenses: Number(thisMonthExpenses._sum.totalAmount ?? 0),
      expenseCount: expenseAgg._count.id,
    };
  }

  async getRevenueTrend(tenantId: string) {
    const months: { month: string; label: string; revenue: number; expenses: number }[] = [];

    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const year = date.getFullYear();
      const month = date.getMonth();
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0, 23, 59, 59);

      const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });

      const [ipcRevenue, expenseTotal] = await this.prisma.withRetry(() =>
        Promise.all([
          this.prisma.ipcRecord.aggregate({
            where: {
              tenantId,
              status: { in: ['CERTIFIED', 'PAID'] },
              certifiedAt: { gte: startDate, lte: endDate },
            },
            _sum: { certifiedNetPayable: true },
          }),
          this.prisma.clientExpense.aggregate({
            where: {
              tenantId,
              date: { gte: startDate, lte: endDate },
            },
            _sum: { totalAmount: true },
          }),
        ]),
      );

      months.push({
        month: monthKey,
        label,
        revenue: Number(ipcRevenue._sum.certifiedNetPayable ?? 0),
        expenses: Number(expenseTotal._sum.totalAmount ?? 0),
      });
    }

    return months;
  }

  async getIpcPipeline(tenantId: string) {
    const pipeline = await this.prisma.withRetry(() =>
      this.prisma.ipcRecord.groupBy({
        by: ['status'],
        where: { tenantId },
        _sum: { netPayable: true, certifiedNetPayable: true },
        _count: { id: true },
      }),
    );

    return pipeline.map((item) => ({
      status: item.status,
      count: item._count.id,
      netPayable: Number(item._sum.netPayable ?? 0),
      certifiedNetPayable: Number(item._sum.certifiedNetPayable ?? 0),
    }));
  }

  async getExpensesByType(tenantId: string) {
    const expenses = await this.prisma.withRetry(() =>
      this.prisma.clientExpense.groupBy({
        by: ['type'],
        where: { tenantId },
        _sum: { totalAmount: true },
        _count: { id: true },
      }),
    );

    return expenses.map((item) => ({
      type: item.type,
      count: item._count.id,
      total: Number(item._sum.totalAmount ?? 0),
    }));
  }

  async getProjectStatusDistribution(tenantId: string) {
    const distribution = await this.prisma.withRetry(() =>
      this.prisma.project.groupBy({
        by: ['status'],
        where: { tenantId, isDeleted: false },
        _count: { id: true },
      }),
    );

    return distribution.map((item) => ({
      status: item.status,
      count: item._count.id,
    }));
  }

  async getRecentActivity(tenantId: string) {
    const activities = await this.prisma.withRetry(() =>
      this.prisma.auditLog.findMany({
        where: { tenantId },
        include: {
          user: {
            select: { id: true, fullName: true, profilePhoto: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    );

    return activities;
  }

  async getUpcomingEvents(tenantId: string) {
    const today = getTodayUtc();
    const twoWeeksLater = new Date(today);
    twoWeeksLater.setDate(twoWeeksLater.getDate() + 14);

    const [projects, milestones, reminders, dprs] =
      await this.prisma.withRetry(() =>
        Promise.all([
          this.prisma.project.findMany({
            where: {
              tenantId,
              isDeleted: false,
              deadline: { gte: today, lte: twoWeeksLater },
            },
            select: {
              id: true,
              name: true,
              code: true,
              deadline: true,
              status: true,
            },
            orderBy: { deadline: 'asc' },
            take: 10,
          }),
          this.prisma.projectMilestone.findMany({
            where: {
              tenantId,
              dueDate: { gte: today, lte: twoWeeksLater },
              status: { notIn: ['COMPLETED', 'CANCELLED'] },
            },
            select: {
              id: true,
              title: true,
              dueDate: true,
              status: true,
              project: { select: { id: true, name: true, code: true } },
            },
            orderBy: { dueDate: 'asc' },
            take: 10,
          }),
          this.prisma.clientNote.findMany({
            where: {
              tenantId,
              isReminder: true,
              reminderDate: { gte: today, lte: twoWeeksLater },
            },
            select: {
              id: true,
              title: true,
              type: true,
              priority: true,
              reminderDate: true,
              client: { select: { id: true, name: true } },
            },
            orderBy: { reminderDate: 'asc' },
            take: 10,
          }),
          this.prisma.dailyProgressReport.findMany({
            where: {
              tenantId,
              reportDate: { gte: today, lte: twoWeeksLater },
            },
            select: {
              id: true,
              title: true,
              reportDate: true,
              site: { select: { id: true, name: true } },
            },
            orderBy: { reportDate: 'asc' },
            take: 10,
          }),
        ]),
      );

    const events: {
      id: string;
      type: string;
      title: string;
      date: Date;
      status: string;
      color: string;
      link: string;
      meta?: string;
    }[] = [];

    for (const p of projects) {
      events.push({
        id: `project-${p.id}`,
        type: 'project',
        title: `Project deadline: ${p.name}`,
        date: p.deadline!,
        status: p.status,
        color: 'orange',
        link: `/projects/${p.id}`,
        meta: p.code,
      });
    }

    for (const m of milestones) {
      events.push({
        id: `milestone-${m.id}`,
        type: 'milestone',
        title: m.title,
        date: m.dueDate,
        status: m.status,
        color: 'green',
        link: `/projects/${m.project.id}`,
        meta: m.project.name,
      });
    }

    for (const r of reminders) {
      events.push({
        id: `reminder-${r.id}`,
        type: 'reminder',
        title: r.title || `${r.type} reminder`,
        date: r.reminderDate!,
        status: r.priority,
        color: 'blue',
        link: `/clients/${r.client.id}`,
        meta: r.client.name,
      });
    }

    for (const d of dprs) {
      events.push({
        id: `dpr-${d.id}`,
        type: 'dpr',
        title: d.title,
        date: d.reportDate,
        status: 'scheduled',
        color: 'purple',
        link: `/sites/${d.site.id}/dpr`,
        meta: d.site.name,
      });
    }

    events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return events.slice(0, 15);
  }
}
