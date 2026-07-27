import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CalendarEvent {
  id: string;
  type: string;
  title: string;
  date: string;
  endDate?: string;
  status: string;
  color: string;
  link: string;
  meta?: string;
  priority?: string;
}

@Injectable()
export class CalendarService {
  constructor(private readonly prisma: PrismaService) {}

  async getEvents(
    tenantId: string,
    startDate: string,
    endDate: string,
    type?: string,
  ): Promise<CalendarEvent[]> {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const types = type ? [type] : ['project', 'milestone', 'reminder', 'dpr'];
    const events: CalendarEvent[] = [];

    const queries: Promise<any[]>[] = [];

    if (types.includes('project')) {
      queries.push(
        this.prisma.project.findMany({
          where: {
            tenantId,
            isDeleted: false,
            deadline: { gte: start, lte: end },
          },
          select: {
            id: true,
            name: true,
            code: true,
            deadline: true,
            startDate: true,
            status: true,
          },
          orderBy: { deadline: 'asc' },
        }),
      );
    } else {
      queries.push(Promise.resolve([]));
    }

    if (types.includes('milestone')) {
      queries.push(
        this.prisma.projectMilestone.findMany({
          where: {
            tenantId,
            dueDate: { gte: start, lte: end },
          },
          select: {
            id: true,
            title: true,
            dueDate: true,
            completedAt: true,
            status: true,
            project: { select: { id: true, name: true, code: true } },
          },
          orderBy: { dueDate: 'asc' },
        }),
      );
    } else {
      queries.push(Promise.resolve([]));
    }

    if (types.includes('reminder')) {
      queries.push(
        this.prisma.clientNote.findMany({
          where: {
            tenantId,
            isReminder: true,
            reminderDate: { gte: start, lte: end },
          },
          select: {
            id: true,
            title: true,
            type: true,
            priority: true,
            reminderDate: true,
            noteDate: true,
            client: { select: { id: true, name: true } },
          },
          orderBy: { reminderDate: 'asc' },
        }),
      );
    } else {
      queries.push(Promise.resolve([]));
    }

    if (types.includes('dpr')) {
      queries.push(
        this.prisma.dailyProgressReport.findMany({
          where: {
            tenantId,
            reportDate: { gte: start, lte: end },
          },
          select: {
            id: true,
            title: true,
            reportDate: true,
            site: { select: { id: true, name: true } },
          },
          orderBy: { reportDate: 'asc' },
        }),
      );
    } else {
      queries.push(Promise.resolve([]));
    }

    const [projects, milestones, reminders, dprs] = await this.prisma.withRetry(() =>
      Promise.all(queries),
    );

    for (const p of projects) {
      events.push({
        id: `project-${p.id}`,
        type: 'project',
        title: p.name,
        date: p.deadline?.toISOString() || start.toISOString(),
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
        date: m.dueDate.toISOString(),
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
        date: r.reminderDate?.toISOString() || r.noteDate?.toISOString() || start.toISOString(),
        status: r.priority,
        color: 'blue',
        link: `/clients/${r.client.id}`,
        meta: r.client.name,
        priority: r.priority,
      });
    }

    for (const d of dprs) {
      events.push({
        id: `dpr-${d.id}`,
        type: 'dpr',
        title: d.title,
        date: d.reportDate.toISOString(),
        status: 'scheduled',
        color: 'purple',
        link: `/sites/${d.site.id}/dpr`,
        meta: d.site.name,
      });
    }

    events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return events;
  }

  async getMonthEvents(tenantId: string, year: number, month: number): Promise<CalendarEvent[]> {
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0);
    return this.getEvents(
      tenantId,
      startDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0],
    );
  }
}
