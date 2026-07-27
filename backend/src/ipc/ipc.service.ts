import { Injectable, NotFoundException, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { I18nService } from '../i18n/i18n.service';
import { CreateIpcDto, SubmitIpcDto, CertifyIpcDto, RejectIpcDto, RecordPaymentDto, QueryIpcDto } from './dto/ipc.dto';
import { IpcStatus, Prisma } from '@prisma/client';
import { parseDateAsUtc } from '../common/utils/date-utils';
import { EmailService } from '../email/email.service';
import { MeasurementBookService } from '../measurement-book/measurement-book.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class IpcService {
  private readonly logger = new Logger(IpcService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly i18n: I18nService,
    private readonly emailService: EmailService,
    private readonly mbService: MeasurementBookService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async findAll(tenantId: string, siteId: string, query: QueryIpcDto, locale: string) {
    await this.verifySiteAccess(tenantId, siteId, locale);

    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where: any = { tenantId, siteId };
    if (query.status) where.status = query.status;

    const [records, total] = await Promise.all([
      this.prisma.ipcRecord.findMany({
        where,
        include: {
          createdBy: { select: { id: true, fullName: true } },
          certifiedBy: { select: { id: true, fullName: true } },
          rejectedBy: { select: { id: true, fullName: true } },
          _count: { select: { lineItems: true, paymentRecords: true } },
        },
        orderBy: { ipcNumber: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.ipcRecord.count({ where }),
    ]);

    return {
      data: records,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getStats(tenantId: string, siteId: string, locale: string) {
    const site = await this.verifySiteAccess(tenantId, siteId, locale);

    const [totalIpcs, draftCount, submittedCount, certifiedCount, paidCount, rejectedCount, totalCertifiedValue] =
      await Promise.all([
        this.prisma.ipcRecord.count({ where: { tenantId, siteId } }),
        this.prisma.ipcRecord.count({ where: { tenantId, siteId, status: IpcStatus.DRAFT } }),
        this.prisma.ipcRecord.count({ where: { tenantId, siteId, status: IpcStatus.SUBMITTED } }),
        this.prisma.ipcRecord.count({ where: { tenantId, siteId, status: IpcStatus.CERTIFIED } }),
        this.prisma.ipcRecord.count({ where: { tenantId, siteId, status: IpcStatus.PAID } }),
        this.prisma.ipcRecord.count({ where: { tenantId, siteId, status: IpcStatus.REJECTED } }),
        this.prisma.ipcRecord.aggregate({
          where: { tenantId, siteId, status: { in: [IpcStatus.CERTIFIED, IpcStatus.PAID] } },
          _sum: { certifiedNetPayable: true, netPayable: true },
        }),
      ]);

    return {
      totalIpcs,
      draftCount,
      submittedCount,
      certifiedCount,
      paidCount,
      rejectedCount,
      totalCertifiedValue: Number(totalCertifiedValue._sum.certifiedNetPayable || totalCertifiedValue._sum.netPayable || 0),
      retentionPercentage: Number(site.retentionPercentage),
      advanceRecoveryAmount: Number(site.advanceRecoveryAmount),
    };
  }

  async findOne(tenantId: string, siteId: string, id: string, locale: string) {
    await this.verifySiteAccess(tenantId, siteId, locale);

    const record = await this.prisma.ipcRecord.findFirst({
      where: { id, tenantId, siteId },
      include: {
        lineItems: {
          include: {
            boqItem: { select: { id: true, itemCode: true, description: true, unit: true, sortOrder: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
        createdBy: { select: { id: true, fullName: true } },
        certifiedBy: { select: { id: true, fullName: true } },
        rejectedBy: { select: { id: true, fullName: true } },
        paymentRecords: {
          include: { recordedBy: { select: { id: true, fullName: true } } },
          orderBy: { paymentDate: 'desc' },
        },
      },
    });

    if (!record) {
      throw new NotFoundException('IPC record not found');
    }

    const site = await this.prisma.site.findUnique({
      where: { id: siteId },
      select: { retentionPercentage: true, advanceRecoveryAmount: true, currencyCode: true },
    });

    // Calculate total paid amount
    const totalPaid = record.paymentRecords.reduce((sum, pr) => sum + Number(pr.amount), 0);

    return {
      ...record,
      totalPaid,
      retentionPercentage: Number(site?.retentionPercentage ?? 10),
      advanceRecoveryAmount: Number(site?.advanceRecoveryAmount ?? 0),
      currencyCode: site?.currencyCode ?? 'USD',
    };
  }

  async create(
    tenantId: string,
    siteId: string,
    userId: string,
    dto: CreateIpcDto,
    locale: string,
  ) {
    const site = await this.verifySiteAccess(tenantId, siteId, locale);

    const billingStart = parseDateAsUtc(dto.billingStartDate);
    const billingEnd = parseDateAsUtc(dto.billingEndDate);

    if (billingEnd <= billingStart) {
      throw new BadRequestException('Billing end date must be after start date');
    }

    // Only block if non-final IPC is pending
    if (!dto.isFinal) {
      const pendingIpc = await this.prisma.ipcRecord.findFirst({
        where: {
          tenantId,
          siteId,
          status: { in: [IpcStatus.DRAFT, IpcStatus.SUBMITTED] },
          isFinal: false,
        },
      });

      if (pendingIpc) {
        throw new ConflictException(
          'Cannot create new IPC while IPC-' + String(pendingIpc.ipcNumber).padStart(2, '0') + ' is in ' + pendingIpc.status + ' status',
        );
      }
    }

    const boqItems = await this.prisma.boQItem.findMany({
      where: { tenantId, siteId, isBaseline: true, variationOrderId: null },
      orderBy: [{ sortOrder: 'asc' }, { itemCode: 'asc' }],
    });

    if (boqItems.length === 0) {
      throw new BadRequestException('No baselined BoQ items found. Baseline the BoQ first.');
    }

    const record = await this.prisma.$transaction(async (tx) => {
      const lastIpc = await tx.ipcRecord.findFirst({
        where: { tenantId, siteId },
        orderBy: { ipcNumber: 'desc' },
        select: { ipcNumber: true },
      });

      const nextNumber = (lastIpc?.ipcNumber || 0) + 1;

      const previousCertifiedIpcs = await tx.ipcRecord.findMany({
        where: {
          tenantId,
          siteId,
          status: { in: [IpcStatus.CERTIFIED, IpcStatus.PAID] },
          ipcNumber: { lt: nextNumber },
        },
        include: {
          lineItems: {
            select: { boqItemId: true, currentQuantity: true, currentAmount: true },
          },
        },
      });

      const previousQtyMap = new Map<string, number>();
      for (const prevIpc of previousCertifiedIpcs) {
        for (const li of prevIpc.lineItems) {
          const existing = previousQtyMap.get(li.boqItemId) || 0;
          previousQtyMap.set(li.boqItemId, existing + Number(li.currentQuantity));
        }
      }

      const lineItems = boqItems.map((boqItem) => {
        const prevQty = previousQtyMap.get(boqItem.id) || 0;
        const prevAmount = prevQty * Number(boqItem.unitRate);

        return {
          tenantId,
          boqItemId: boqItem.id,
          boqUnitRate: boqItem.unitRate,
          boqQuantity: boqItem.estimatedQty,
          previousQuantity: prevQty,
          previousAmount: prevAmount,
          currentQuantity: 0,
          currentPercent: 0,
          currentAmount: 0,
          cumulativeQuantity: prevQty,
          cumulativeAmount: prevAmount,
        };
      });

      // Auto-fill from Measurement Book if MB-linked
      if (dto.isMbLinked) {
        try {
          const mbAggregated = await this.mbService.getAggregatedByBoqItem(
            tenantId, siteId,
            dto.billingStartDate, dto.billingEndDate,
            locale,
          );
          const mbMap = new Map(mbAggregated.map((a: any) => [a.boqItemId, a.totalQuantity]));
          for (const li of lineItems) {
            const mbQty = mbMap.get(li.boqItemId) || 0;
            if (mbQty > 0) {
              li.currentQuantity = mbQty;
              li.currentPercent = Number(li.boqQuantity) > 0 ? (mbQty / Number(li.boqQuantity)) * 100 : 0;
              li.currentAmount = Math.round(mbQty * Number(li.boqUnitRate) * 100) / 100;
              li.cumulativeQuantity = li.previousQuantity + mbQty;
              li.cumulativeAmount = Math.round(li.cumulativeQuantity * Number(li.boqUnitRate) * 100) / 100;
            }
          }
        } catch (e) {
          this.logger.warn(`MB aggregation failed for IPC create, line items default to 0: ${e.message}`);
        }
      }

      const grossClaimed = lineItems.reduce((sum, li) => sum + Number(li.currentAmount), 0);
      const retentionPct = Number(site.retentionPercentage) / 100;
      const retentionDeduction = grossClaimed * retentionPct;
      const advanceRecovery = Number(site.advanceRecoveryAmount);
      const netPayable = grossClaimed - retentionDeduction - advanceRecovery;

      const ipc = await tx.ipcRecord.create({
        data: {
          tenantId,
          siteId,
          ipcNumber: nextNumber,
          billingStartDate: billingStart,
          billingEndDate: billingEnd,
          status: 'DRAFT',
          isFinal: dto.isFinal || false,
          isMbLinked: dto.isMbLinked || false,
          grossClaimed,
          retentionDeduction,
          advanceRecovery,
          netPayable,
          createdById: userId,
        },
      });

      await tx.ipcLineItem.createMany({
        data: lineItems.map((li) => ({ ...li, ipcRecordId: ipc.id })),
      });

      return ipc;
    });

    return this.findOne(tenantId, siteId, record.id, locale);
  }

  async submit(
    tenantId: string,
    siteId: string,
    id: string,
    userId: string,
    dto: SubmitIpcDto,
    locale: string,
  ) {
    await this.verifySiteAccess(tenantId, siteId, locale);

    const record = await this.prisma.ipcRecord.findFirst({
      where: { id, tenantId, siteId, status: 'DRAFT' },
    });

    if (!record) {
      throw new NotFoundException('Draft IPC record not found');
    }

    const site = await this.prisma.site.findFirst({
      where: { id: siteId },
      select: { retentionPercentage: true, advanceRecoveryAmount: true },
    });

    const existingLineItems = await this.prisma.ipcLineItem.findMany({
      where: { ipcRecordId: id },
      select: { boqItemId: true, previousQuantity: true },
    });
    const prevQtyMap = new Map(existingLineItems.map((li) => [li.boqItemId, Number(li.previousQuantity)]));

    const boqItems = await this.prisma.boQItem.findMany({
      where: { tenantId, siteId, isBaseline: true, variationOrderId: null },
    });

    const boqMap = new Map(boqItems.map((b) => [b.id, b]));

    let grossClaimed = 0;

    const lineItemUpdates = dto.lineItems.map((li) => {
      const boqItem = boqMap.get(li.boqItemId);
      if (!boqItem) throw new BadRequestException(`BoQ item ${li.boqItemId} not found`);

      const boqQty = Number(boqItem.estimatedQty);
      const rate = Number(boqItem.unitRate);
      const prevQty = prevQtyMap.get(li.boqItemId) || 0;

      const currentQty = li.currentQuantity;
      const currentPct = boqQty > 0 ? (currentQty / boqQty) * 100 : 0;
      const currentAmt = currentQty * rate;
      const cumQty = prevQty + currentQty;
      const cumAmt = cumQty * rate;

      if (cumQty > boqQty) {
        throw new BadRequestException(
          `Cumulative quantity (${cumQty}) exceeds BoQ quantity (${boqQty}) for item ${boqItem.itemCode}`,
        );
      }

      grossClaimed += currentAmt;

      return {
        where: { ipcRecordId_boqItemId: { ipcRecordId: id, boqItemId: li.boqItemId } },
        data: {
          currentQuantity: currentQty,
          currentPercent: currentPct,
          currentAmount: currentAmt,
          cumulativeQuantity: cumQty,
          cumulativeAmount: cumAmt,
        },
      };
    });

    const retentionPct = Number(site?.retentionPercentage || 10) / 100;
    const retentionDeduction = grossClaimed * retentionPct;
    const advanceRecovery = Number(site?.advanceRecoveryAmount || 0);
    const netPayable = grossClaimed - retentionDeduction - advanceRecovery;

    await this.prisma.$transaction(async (tx) => {
      for (const update of lineItemUpdates) {
        await tx.ipcLineItem.update(update);
      }

      await tx.ipcRecord.update({
        where: { id },
        data: {
          status: 'SUBMITTED',
          grossClaimed,
          retentionDeduction,
          advanceRecovery,
          netPayable,
          submittedAt: new Date(),
        },
      });
    });

    await this.auditLog(tenantId, userId, 'IPC_SUBMITTED', 'IPC', id, {
      ipcNumber: record.ipcNumber,
      grossClaimed,
      netPayable,
    });

    this.notifySiteMembers(tenantId, siteId, userId, {
      type: 'IPC_UPDATE',
      title: `IPC-${String(record.ipcNumber).padStart(2, '0')} submitted`,
      message: `IPC has been submitted for certification with gross claim of ${grossClaimed}`,
      linkUrl: `/sites/${siteId}/ipc`,
    });

    this.sendIpcEmails(tenantId, siteId, id, 'submitted', locale).catch((e) =>
      this.logger.warn(`Failed to send IPC submitted emails: ${e.message}`),
    );

    return this.findOne(tenantId, siteId, id, locale);
  }

  async certify(
    tenantId: string,
    siteId: string,
    id: string,
    userId: string,
    dto: CertifyIpcDto,
    locale: string,
  ) {
    await this.verifySiteAccess(tenantId, siteId, locale);

    const record = await this.prisma.ipcRecord.findFirst({
      where: { id, tenantId, siteId, status: 'SUBMITTED' },
      include: { lineItems: true },
    });

    if (!record) {
      throw new NotFoundException('Submitted IPC record not found');
    }

    const site = await this.prisma.site.findFirst({
      where: { id: siteId },
      select: { retentionPercentage: true, advanceRecoveryAmount: true },
    });

    const certifiedQtyMap = new Map(
      dto.lineItems.map((li) => [li.boqItemId, li.certifiedQuantity]),
    );

    let certifiedGross = 0;

    const lineItemUpdates = record.lineItems.map((li) => {
      const certifiedQty = certifiedQtyMap.get(li.boqItemId) ?? Number(li.currentQuantity);
      const certifiedAmt = certifiedQty * Number(li.boqUnitRate);

      certifiedGross += certifiedAmt;

      return {
        where: { id: li.id },
        data: {
          certifiedQuantity: certifiedQty,
          certifiedAmount: certifiedAmt,
        },
      };
    });

    const retentionPct = Number(site?.retentionPercentage || 10) / 100;
    const certifiedRetention = certifiedGross * retentionPct;
    const certifiedAdvanceRecovery = Number(site?.advanceRecoveryAmount || 0);
    const certifiedNetPayable = certifiedGross - certifiedRetention - certifiedAdvanceRecovery;

    await this.prisma.$transaction(async (tx) => {
      for (const update of lineItemUpdates) {
        await tx.ipcLineItem.update(update);
      }

      await tx.ipcRecord.update({
        where: { id },
        data: {
          status: 'CERTIFIED',
          certifiedGross,
          certifiedRetention,
          certifiedAdvanceRecovery,
          certifiedNetPayable,
          certifiedById: userId,
          certifiedAt: new Date(),
          retentionReleased: dto.retentionReleased || false,
          retentionReleasedAt: dto.retentionReleased ? new Date() : null,
        },
      });
    });

    await this.auditLog(tenantId, userId, 'IPC_CERTIFIED', 'IPC', id, {
      ipcNumber: record.ipcNumber,
      certifiedGross,
      certifiedNetPayable,
      retentionReleased: dto.retentionReleased,
    });

    this.notifySiteMembers(tenantId, siteId, userId, {
      type: 'IPC_UPDATE',
      title: `IPC-${String(record.ipcNumber).padStart(2, '0')} certified`,
      message: `IPC has been certified with net payable of ${certifiedNetPayable}`,
      linkUrl: `/sites/${siteId}/ipc`,
    });

    this.sendIpcEmails(tenantId, siteId, id, 'certified', locale).catch((e) =>
      this.logger.warn(`Failed to send IPC certified emails: ${e.message}`),
    );

    return this.findOne(tenantId, siteId, id, locale);
  }

  async reject(
    tenantId: string,
    siteId: string,
    id: string,
    userId: string,
    dto: RejectIpcDto,
    locale: string,
  ) {
    await this.verifySiteAccess(tenantId, siteId, locale);

    const record = await this.prisma.ipcRecord.findFirst({
      where: { id, tenantId, siteId, status: 'SUBMITTED' },
    });

    if (!record) {
      throw new NotFoundException('Submitted IPC record not found');
    }

    await this.prisma.ipcRecord.update({
      where: { id },
      data: {
        status: 'DRAFT',
        rejectedAt: new Date(),
        rejectedById: userId,
        rejectionReason: dto.reason,
      },
    });

    await this.auditLog(tenantId, userId, 'IPC_REJECTED', 'IPC', id, {
      ipcNumber: record.ipcNumber,
      reason: dto.reason,
    });

    this.notifySiteMembers(tenantId, siteId, userId, {
      type: 'IPC_UPDATE',
      title: `IPC-${String(record.ipcNumber).padStart(2, '0')} rejected`,
      message: `IPC has been rejected and returned to draft`,
      linkUrl: `/sites/${siteId}/ipc`,
    });

    this.sendIpcEmails(tenantId, siteId, id, 'rejected', locale).catch((e) =>
      this.logger.warn(`Failed to send IPC rejected emails: ${e.message}`),
    );

    return this.findOne(tenantId, siteId, id, locale);
  }

  async recordPayment(
    tenantId: string,
    siteId: string,
    id: string,
    userId: string,
    dto: RecordPaymentDto,
    locale: string,
  ) {
    await this.verifySiteAccess(tenantId, siteId, locale);

    const record = await this.prisma.ipcRecord.findFirst({
      where: { id, tenantId, siteId },
      include: { paymentRecords: true },
    });

    if (!record) {
      throw new NotFoundException('IPC record not found');
    }

    if (record.status !== 'CERTIFIED' && record.status !== 'PAID') {
      throw new BadRequestException('Payments can only be recorded against certified or paid IPCs');
    }

    const certifiedAmount = Number(record.certifiedNetPayable || record.netPayable);
    const totalPaid = record.paymentRecords.reduce((sum, pr) => sum + Number(pr.amount), 0);
    const remaining = certifiedAmount - totalPaid;

    if (dto.amount > remaining) {
      throw new BadRequestException(
        `Payment amount (${dto.amount}) exceeds remaining balance (${remaining.toFixed(2)})`,
      );
    }

    const payment = await this.prisma.$transaction(async (tx) => {
      const newPayment = await tx.ipcPaymentRecord.create({
        data: {
          tenantId,
          ipcRecordId: id,
          amount: dto.amount,
          paymentDate: parseDateAsUtc(dto.paymentDate),
          paymentMethod: dto.paymentMethod,
          referenceNumber: dto.referenceNumber,
          notes: dto.notes,
          recordedById: userId,
        },
      });

      // Update IPC status to PAID if fully paid
      const newTotalPaid = totalPaid + dto.amount;
      if (newTotalPaid >= certifiedAmount) {
        await tx.ipcRecord.update({
          where: { id },
          data: { status: 'PAID', paidAt: new Date() },
        });
      }

      return newPayment;
    });

    await this.auditLog(tenantId, userId, 'IPC_PAYMENT_RECORDED', 'IPC', id, {
      ipcNumber: record.ipcNumber,
      amount: dto.amount,
      paymentDate: dto.paymentDate,
      referenceNumber: dto.referenceNumber,
    });

    this.notifySiteMembers(tenantId, siteId, userId, {
      type: 'IPC_UPDATE',
      title: `IPC-${String(record.ipcNumber).padStart(2, '0')} payment recorded`,
      message: `Payment of ${dto.amount} recorded for IPC`,
      linkUrl: `/sites/${siteId}/ipc`,
    });

    this.sendIpcEmails(tenantId, siteId, id, 'paid', locale).catch((e) =>
      this.logger.warn(`Failed to send IPC paid emails: ${e.message}`),
    );

    return this.findOne(tenantId, siteId, id, locale);
  }

  async markPaid(
    tenantId: string,
    siteId: string,
    id: string,
    userId: string,
    locale: string,
  ) {
    await this.verifySiteAccess(tenantId, siteId, locale);

    const record = await this.prisma.ipcRecord.findFirst({
      where: { id, tenantId, siteId, status: 'CERTIFIED' },
    });

    if (!record) {
      throw new NotFoundException('Certified IPC record not found');
    }

    const updated = await this.prisma.ipcRecord.update({
      where: { id },
      data: {
        status: 'PAID',
        paidAt: new Date(),
      },
    });

    await this.auditLog(tenantId, userId, 'IPC_MARKED_PAID', 'IPC', id, {
      ipcNumber: record.ipcNumber,
    });

    this.notifySiteMembers(tenantId, siteId, userId, {
      type: 'IPC_UPDATE',
      title: `IPC-${String(record.ipcNumber).padStart(2, '0')} marked as paid`,
      message: `IPC has been marked as fully paid`,
      linkUrl: `/sites/${siteId}/ipc`,
    });

    return this.findOne(tenantId, siteId, id, locale);
  }

  private async sendIpcEmails(
    tenantId: string,
    siteId: string,
    ipcId: string,
    event: 'submitted' | 'certified' | 'paid' | 'rejected',
    locale: string,
  ) {
    try {
      const [ipc, site, company] = await Promise.all([
        this.prisma.ipcRecord.findFirst({
          where: { id: ipcId },
          include: {
            createdBy: { select: { email: true, fullName: true } },
            certifiedBy: { select: { email: true, fullName: true } },
            rejectedBy: { select: { email: true, fullName: true } },
          },
        }),
        this.prisma.site.findFirst({
          where: { id: siteId },
          select: { name: true, siteManagerId: true },
        }),
        this.prisma.companySettings.findFirst({
          where: { tenantId },
          select: { email: true },
        }),
      ]);

      if (!ipc || !site) return;

      const ipcLabel = `IPC-${String(ipc.ipcNumber).padStart(2, '0')}`;
      const siteManager = await this.prisma.user.findFirst({
        where: { id: site.siteManagerId },
        select: { email: true, fullName: true },
      });

      if (event === 'submitted' && siteManager?.email) {
        await this.emailService.sendIpcSubmittedEmail(
          siteManager.email,
          String(ipc.ipcNumber).padStart(2, '0'),
          site.name,
          ipc.createdBy?.fullName || 'Unknown',
          locale,
        );
      }

      if (event === 'certified') {
        const netPayable = ipc.certifiedNetPayable ? Number(ipc.certifiedNetPayable).toFixed(2) : '0.00';
        const recipients = [ipc.createdBy?.email, company?.email].filter(Boolean) as string[];
        for (const email of recipients) {
          await this.emailService.sendIpcCertifiedEmail(
            email,
            String(ipc.ipcNumber).padStart(2, '0'),
            site.name,
            ipc.certifiedBy?.fullName || 'Unknown',
            netPayable,
            locale,
          );
        }
      }

      if (event === 'paid') {
        const recipients = [ipc.createdBy?.email, siteManager?.email, company?.email].filter(Boolean) as string[];
        for (const email of recipients) {
          await this.emailService.sendIpcPaidEmail(
            email,
            String(ipc.ipcNumber).padStart(2, '0'),
            site.name,
            locale,
          );
        }
      }

      if (event === 'rejected' && ipc.createdBy?.email) {
        await this.emailService.sendIpcRejectedEmail(
          ipc.createdBy.email,
          String(ipc.ipcNumber).padStart(2, '0'),
          site.name,
          ipc.rejectedBy?.fullName || 'Unknown',
          ipc.rejectionReason || '',
          locale,
        );
      }
    } catch (e) {
      this.logger.warn(`Email notification failed for IPC ${ipcId}: ${e.message}`);
    }
  }

  private async verifySiteAccess(tenantId: string, siteId: string, locale: string) {
    const site = await this.prisma.site.findFirst({
      where: { id: siteId, tenantId, isDeleted: false },
    });
    if (!site) {
      throw new NotFoundException(this.i18n.translate('sites.errors.notFound', {}, locale));
    }
    return site;
  }

  private async auditLog(
    tenantId: string,
    userId: string,
    action: string,
    module: string,
    recordId: string,
    newValues?: any,
  ) {
    try {
      await this.prisma.auditLog.create({
        data: { tenantId, userId, action, module, recordId, newValues },
      });
    } catch (e) {
      this.logger.warn(`Failed to create audit log: ${e.message}`);
    }
  }

  private async notifySiteMembers(
    tenantId: string,
    siteId: string,
    excludeUserId: string,
    dto: { type: string; title: string; message: string; linkUrl?: string },
  ) {
    try {
      const site = await this.prisma.site.findFirst({
        where: { id: siteId },
        select: { siteManagerId: true, projectId: true },
      });
      if (!site) return;

      const userIds: string[] = [];
      if (site.siteManagerId && site.siteManagerId !== excludeUserId) {
        userIds.push(site.siteManagerId);
      }

      const project = await this.prisma.project.findFirst({
        where: { id: site.projectId },
        select: { projectManagerId: true },
      });
      if (project?.projectManagerId && project.projectManagerId !== excludeUserId) {
        userIds.push(project.projectManagerId);
      }

      if (userIds.length > 0) {
        await this.notificationsService.createMany(tenantId, userIds, dto);
      }
    } catch (e) {
      this.logger.warn(`Failed to create notifications: ${e.message}`);
    }
  }
}
