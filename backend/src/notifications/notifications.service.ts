import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateNotificationDto {
  userId: string;
  type: string;
  title: string;
  message: string;
  linkUrl?: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateNotificationDto) {
    try {
      return await this.prisma.notification.create({
        data: {
          tenantId,
          userId: dto.userId,
          type: dto.type,
          title: dto.title,
          message: dto.message,
          linkUrl: dto.linkUrl || null,
        },
      });
    } catch (e) {
      this.logger.warn(`Failed to create notification: ${e.message}`);
      return null;
    }
  }

  async createMany(tenantId: string, userIds: string[], dto: Omit<CreateNotificationDto, 'userId'>) {
    try {
      return await this.prisma.notification.createMany({
        data: userIds.map((userId) => ({
          tenantId,
          userId,
          type: dto.type,
          title: dto.title,
          message: dto.message,
          linkUrl: dto.linkUrl || null,
        })),
      });
    } catch (e) {
      this.logger.warn(`Failed to create notifications: ${e.message}`);
      return null;
    }
  }

  async findAll(tenantId: string, userId: string, query: { page?: number; limit?: number; unreadOnly?: boolean }) {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 50);
    const skip = (page - 1) * limit;

    const where: any = { tenantId, userId };
    if (query.unreadOnly) where.isRead = false;

    const [notifications, total, unreadCount] = await this.prisma.withRetry(() =>
      Promise.all([
        this.prisma.notification.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        this.prisma.notification.count({ where }),
        this.prisma.notification.count({ where: { tenantId, userId, isRead: false } }),
      ]),
    );

    return {
      data: notifications,
      unreadCount,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async markAsRead(tenantId: string, userId: string, notificationId: string) {
    return this.prisma.notification.updateMany({
      where: { id: notificationId, tenantId, userId },
      data: { isRead: true },
    });
  }

  async markAllAsRead(tenantId: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { tenantId, userId, isRead: false },
      data: { isRead: true },
    });
  }

  async remove(tenantId: string, userId: string, notificationId: string) {
    return this.prisma.notification.deleteMany({
      where: { id: notificationId, tenantId, userId },
    });
  }
}
