import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CompanySettingsService } from '../company-settings/company-settings.service';
import PDFDocument from 'pdfkit';
import * as XLSX from 'xlsx';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly companySettingsService: CompanySettingsService,
  ) {}

  async generateBoqExcel(tenantId: string, siteId: string): Promise<Buffer> {
    const site = await this.prisma.site.findFirst({
      where: { id: siteId, tenantId },
      include: {
        project: { select: { name: true, code: true } },
        boqSections: {
          where: { tenantId },
          orderBy: { sortOrder: 'asc' },
          include: {
            items: {
              where: { tenantId, isBaseline: true },
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
        boqItems: {
          where: { tenantId, isBaseline: true, sectionId: null },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!site) throw new NotFoundException('Site not found');

    const wb = XLSX.utils.book_new();
    const rows: any[][] = [
      ['Item Code', 'Description', 'Unit', 'Est. Qty', 'Unit Rate', 'Total Amount', 'Section'],
    ];

    let grandTotal = 0;
    for (const section of site.boqSections) {
      for (const item of section.items) {
        const total = Number(item.totalAmount);
        grandTotal += total;
        rows.push([
          item.itemCode,
          item.description,
          item.unit,
          Number(item.estimatedQty),
          Number(item.unitRate),
          total,
          section.name,
        ]);
      }
    }

    for (const item of site.boqItems) {
      const total = Number(item.totalAmount);
      grandTotal += total;
      rows.push([
        item.itemCode,
        item.description,
        item.unit,
        Number(item.estimatedQty),
        Number(item.unitRate),
        total,
        'Uncategorized',
      ]);
    }

    rows.push([]);
    rows.push(['', '', '', '', 'TOTAL', grandTotal]);

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [
      { wch: 12 }, { wch: 40 }, { wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 20 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'BoQ');
    return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
  }

  async generateBoqPdf(tenantId: string, siteId: string): Promise<Buffer> {
    const site = await this.prisma.site.findFirst({
      where: { id: siteId, tenantId },
      include: {
        project: { select: { name: true, code: true } },
        boqSections: {
          where: { tenantId },
          orderBy: { sortOrder: 'asc' },
          include: {
            items: {
              where: { tenantId, isBaseline: true },
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
      },
    });

    if (!site) throw new NotFoundException('Site not found');

    let settings: any = null;
    try {
      settings = await this.companySettingsService.getSettings(tenantId);
    } catch {
      this.logger.warn('Could not load company settings');
    }

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true });
        const chunks: Buffer[] = [];
        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Header
        const companyName = settings?.companyName || 'SitePilotIQ';
        doc.fontSize(16).font('Helvetica-Bold').text(companyName, { align: 'center' });
        doc.moveDown(0.3);
        doc.fontSize(14).font('Helvetica-Bold').text('Bill of Quantities', { align: 'center' });
        doc.moveDown(0.3);
        doc.fontSize(10).font('Helvetica').text(`${site.project?.name || ''} - ${site.name}`, { align: 'center' });
        doc.moveDown(0.5);

        doc.fontSize(9).font('Helvetica').text(`Site Code: ${site.code}`, 40);
        doc.moveDown(0.3);

        // Table header
        const tableTop = doc.y;
        const colX = [40, 90, 280, 330, 370, 440];
        const colW = [50, 190, 50, 40, 70, 70];

        doc.fontSize(8).font('Helvetica-Bold');
        doc.fillColor('#f0f0f0').rect(40, tableTop, doc.page.width - 80, 18).fill('#000');
        const headers = ['Code', 'Description', 'Unit', 'Qty', 'Rate', 'Amount'];
        headers.forEach((h, i) => doc.text(h, colX[i], tableTop + 4, { width: colW[i] }));

        doc.y = tableTop + 22;
        doc.font('Helvetica').fontSize(8);

        let grandTotal = 0;
        let rowY = doc.y;

        for (const section of site.boqSections) {
          // Section header
          doc.font('Helvetica-Bold').fontSize(9);
          doc.text(section.name, 40, rowY, { width: doc.page.width - 80 });
          rowY = doc.y + 4;
          doc.font('Helvetica').fontSize(8);

          for (const item of section.items) {
            if (rowY > doc.page.height - 60) {
              doc.addPage();
              rowY = 50;
            }

            const total = Number(item.totalAmount);
            grandTotal += total;
            const currency = site.currencyCode || 'USD';

            doc.text(item.itemCode, colX[0], rowY, { width: colW[0], continued: false });
            doc.text(item.description.substring(0, 50), colX[1], rowY, { width: colW[1] });
            doc.text(item.unit, colX[2], rowY, { width: colW[2] });
            doc.text(Number(item.estimatedQty).toFixed(2), colX[3], rowY, { width: colW[3], align: 'right' });
            doc.text(`${currency} ${Number(item.unitRate).toFixed(2)}`, colX[4], rowY, { width: colW[4], align: 'right' });
            doc.text(`${currency} ${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, colX[5], rowY, { width: colW[5], align: 'right' });

            rowY = doc.y + 4;
            doc.moveTo(40, rowY).lineTo(doc.page.width - 40, rowY).strokeColor('#e0e0e0').stroke();
            rowY += 4;
          }
        }

        // Grand total
        rowY += 10;
        doc.font('Helvetica-Bold').fontSize(10);
        doc.text('Grand Total:', 300, rowY, { width: 70, align: 'right' });
        doc.text(`${grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 370, rowY, { width: 70, align: 'right' });

        // Footer
        const pageCount = doc.bufferedPageRange().count;
        for (let i = 0; i < pageCount; i++) {
          doc.switchToPage(i);
          doc.fontSize(8).font('Helvetica').fillColor('#999');
          doc.text(
            `Generated by SitePilotIQ | Page ${i + 1} of ${pageCount}`,
            40,
            doc.page.height - 30,
            { align: 'center', width: doc.page.width - 80 },
          );
        }

        doc.end();
      } catch (error) {
        this.logger.error(`Failed to generate BoQ PDF: ${error.message}`);
        reject(error);
      }
    });
  }

  async generateDprPdf(tenantId: string, siteId: string, dprId: string): Promise<Buffer> {
    const dpr = await this.prisma.dailyProgressReport.findFirst({
      where: { id: dprId, siteId, tenantId },
      include: {
        site: {
          select: {
            name: true,
            code: true,
            project: { select: { name: true, code: true } },
          },
        },
        createdBy: { select: { fullName: true } },
      },
    });

    if (!dpr) throw new NotFoundException('DPR not found');

    let settings: any = null;
    try {
      settings = await this.companySettingsService.getSettings(tenantId);
    } catch {
      this.logger.warn('Could not load company settings');
    }

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true });
        const chunks: Buffer[] = [];
        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        const companyName = settings?.companyName || 'SitePilotIQ';
        doc.fontSize(16).font('Helvetica-Bold').text(companyName, { align: 'center' });
        doc.moveDown(0.3);
        doc.fontSize(14).font('Helvetica-Bold').text('Daily Progress Report', { align: 'center' });
        doc.moveDown(0.5);

        doc.fontSize(10).font('Helvetica');
        doc.text(`Site: ${dpr.site.code} - ${dpr.site.name}`, 40);
        doc.text(`Project: ${dpr.site.project?.name || ''}`);
        doc.text(`Date: ${new Date(dpr.reportDate).toLocaleDateString()}`);
        doc.text(`Title: ${dpr.title}`);
        doc.text(`Prepared by: ${dpr.createdBy?.fullName || 'Unknown'}`);
        doc.moveDown(0.5);

        // Info box
        const boxY = doc.y;
        doc.rect(40, boxY, doc.page.width - 80, 40).stroke('#cccccc');
        doc.fontSize(9).font('Helvetica-Bold');
        doc.text(`Weather: ${dpr.weather || 'N/A'}`, 50, boxY + 8);
        doc.text(`Temperature: ${dpr.temperature || 'N/A'}`, 250, boxY + 8);
        doc.text(`Workers on Site: ${dpr.workersOnSite}`, 50, boxY + 22);
        doc.text(`Equipment: ${dpr.equipmentOnSite || 'N/A'}`, 250, boxY + 22);
        doc.y = boxY + 50;

        // Sections
        const addSection = (title: string, content: string) => {
          if (doc.y > doc.page.height - 100) {
            doc.addPage();
          }
          doc.fontSize(11).font('Helvetica-Bold').text(title);
          doc.moveDown(0.2);
          doc.fontSize(9).font('Helvetica').text(content || 'N/A');
          doc.moveDown(0.5);
        };

        addSection('Work Completed', dpr.workCompleted);
        addSection('Work Planned', dpr.workPlanned);
        if (dpr.narrative) addSection('Narrative', dpr.narrative);
        if (dpr.issuesRisks) addSection('Issues & Risks', dpr.issuesRisks);

        // Footer
        const pageCount = doc.bufferedPageRange().count;
        for (let i = 0; i < pageCount; i++) {
          doc.switchToPage(i);
          doc.fontSize(8).font('Helvetica').fillColor('#999');
          doc.text(
            `Generated by SitePilotIQ | Page ${i + 1} of ${pageCount}`,
            40,
            doc.page.height - 30,
            { align: 'center', width: doc.page.width - 80 },
          );
        }

        doc.end();
      } catch (error) {
        this.logger.error(`Failed to generate DPR PDF: ${error.message}`);
        reject(error);
      }
    });
  }

  async generateExpensesExcel(tenantId: string, clientId: string): Promise<Buffer> {
    const client = await this.prisma.client.findFirst({
      where: { id: clientId, tenantId },
      include: {
        expenses: {
          where: { tenantId },
          orderBy: { date: 'desc' },
        },
      },
    });

    if (!client) throw new NotFoundException('Client not found');

    const wb = XLSX.utils.book_new();
    const rows: any[][] = [
      ['Date', 'Type', 'Reference', 'Description', 'Amount', 'Tax', 'Total', 'Status'],
    ];

    let grandTotal = 0;
    for (const exp of client.expenses) {
      const total = Number(exp.totalAmount);
      grandTotal += total;
      rows.push([
        new Date(exp.date).toLocaleDateString(),
        exp.type,
        exp.referenceNumber || '',
        exp.description,
        Number(exp.amount),
        Number(exp.taxAmount),
        total,
        exp.status,
      ]);
    }

    rows.push([]);
    rows.push(['', '', '', 'TOTAL', '', '', grandTotal]);

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [
      { wch: 12 }, { wch: 18 }, { wch: 15 }, { wch: 30 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 10 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'Expenses');
    return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
  }

  async generateExpensesPdf(tenantId: string, clientId: string): Promise<Buffer> {
    const client = await this.prisma.client.findFirst({
      where: { id: clientId, tenantId },
      include: {
        expenses: {
          where: { tenantId },
          orderBy: { date: 'desc' },
        },
      },
    });

    if (!client) throw new NotFoundException('Client not found');

    let settings: any = null;
    try {
      settings = await this.companySettingsService.getSettings(tenantId);
    } catch {
      this.logger.warn('Could not load company settings');
    }

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true });
        const chunks: Buffer[] = [];
        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        const companyName = settings?.companyName || 'SitePilotIQ';
        doc.fontSize(16).font('Helvetica-Bold').text(companyName, { align: 'center' });
        doc.moveDown(0.3);
        doc.fontSize(14).font('Helvetica-Bold').text('Expense Report', { align: 'center' });
        doc.moveDown(0.3);
        doc.fontSize(10).font('Helvetica').text(`Client: ${client.name}`, { align: 'center' });
        doc.moveDown(0.5);

        // Table
        const colX = [40, 100, 180, 280, 350, 420];
        const colW = [60, 80, 100, 70, 70, 70];
        const tableTop = doc.y;

        doc.fontSize(8).font('Helvetica-Bold');
        doc.fillColor('#f0f0f0').rect(40, tableTop, doc.page.width - 80, 18).fill('#000');
        ['Date', 'Type', 'Description', 'Amount', 'Tax', 'Total'].forEach((h, i) => {
          doc.text(h, colX[i], tableTop + 4, { width: colW[i] });
        });

        doc.y = tableTop + 22;
        doc.font('Helvetica').fontSize(8);

        let grandTotal = 0;
        let rowY = doc.y;

        for (const exp of client.expenses) {
          if (rowY > doc.page.height - 60) {
            doc.addPage();
            rowY = 50;
          }

          const total = Number(exp.totalAmount);
          grandTotal += total;

          doc.text(new Date(exp.date).toLocaleDateString(), colX[0], rowY, { width: colW[0] });
          doc.text(exp.type, colX[1], rowY, { width: colW[1] });
          doc.text(exp.description.substring(0, 40), colX[2], rowY, { width: colW[2] });
          doc.text(Number(exp.amount).toFixed(2), colX[3], rowY, { width: colW[3], align: 'right' });
          doc.text(Number(exp.taxAmount).toFixed(2), colX[4], rowY, { width: colW[4], align: 'right' });
          doc.text(total.toFixed(2), colX[5], rowY, { width: colW[5], align: 'right' });

          rowY = doc.y + 4;
          doc.moveTo(40, rowY).lineTo(doc.page.width - 40, rowY).strokeColor('#e0e0e0').stroke();
          rowY += 4;
        }

        rowY += 10;
        doc.font('Helvetica-Bold').fontSize(10);
        doc.text('Grand Total:', 300, rowY, { width: 70, align: 'right' });
        doc.text(`${grandTotal.toFixed(2)}`, 370, rowY, { width: 70, align: 'right' });

        const pageCount = doc.bufferedPageRange().count;
        for (let i = 0; i < pageCount; i++) {
          doc.switchToPage(i);
          doc.fontSize(8).font('Helvetica').fillColor('#999');
          doc.text(
            `Generated by SitePilotIQ | Page ${i + 1} of ${pageCount}`,
            40,
            doc.page.height - 30,
            { align: 'center', width: doc.page.width - 80 },
          );
        }

        doc.end();
      } catch (error) {
        this.logger.error(`Failed to generate expenses PDF: ${error.message}`);
        reject(error);
      }
    });
  }

  async generateSiteSummaryPdf(tenantId: string, siteId: string): Promise<Buffer> {
    const site = await this.prisma.site.findFirst({
      where: { id: siteId, tenantId },
      include: {
        project: { select: { name: true, code: true, deadline: true } },
        boqItems: {
          where: { tenantId, isBaseline: true },
        },
        ipcRecords: {
          where: { tenantId },
          orderBy: { ipcNumber: 'desc' },
          take: 5,
        },
        dailyReports: {
          where: { tenantId },
          orderBy: { reportDate: 'desc' },
          take: 5,
        },
        _count: {
          select: { dailyReports: true, photos: true, assignments: true },
        },
      },
    });

    if (!site) throw new NotFoundException('Site not found');

    let settings: any = null;
    try {
      settings = await this.companySettingsService.getSettings(tenantId);
    } catch {
      this.logger.warn('Could not load company settings');
    }

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true });
        const chunks: Buffer[] = [];
        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        const companyName = settings?.companyName || 'SitePilotIQ';
        doc.fontSize(16).font('Helvetica-Bold').text(companyName, { align: 'center' });
        doc.moveDown(0.3);
        doc.fontSize(14).font('Helvetica-Bold').text('Site Summary Report', { align: 'center' });
        doc.moveDown(0.5);

        // Site info
        doc.fontSize(10).font('Helvetica-Bold').text('Site Information');
        doc.moveDown(0.2);
        doc.fontSize(9).font('Helvetica');
        doc.text(`Site: ${site.code} - ${site.name}`);
        doc.text(`Project: ${site.project?.name || 'N/A'}`);
        doc.text(`Status: ${site.status}`);
        doc.text(`Planned End: ${site.plannedEndDate ? new Date(site.plannedEndDate).toLocaleDateString() : 'N/A'}`);
        doc.moveDown(0.5);

        // Stats
        const boqTotal = site.boqItems.reduce((sum, i) => sum + Number(i.totalAmount), 0);
        doc.fontSize(10).font('Helvetica-Bold').text('Statistics');
        doc.moveDown(0.2);
        doc.fontSize(9).font('Helvetica');
        doc.text(`Total BoQ Items: ${site.boqItems.length}`);
        doc.text(`BoQ Total Value: $${boqTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
        doc.text(`Total IPCs: ${site.ipcRecords.length}`);
        doc.text(`Daily Reports: ${site._count.dailyReports}`);
        doc.text(`Photos: ${site._count.photos}`);
        doc.text(`Active Assignments: ${site._count.assignments}`);
        doc.moveDown(0.5);

        // Recent IPCs
        if (site.ipcRecords.length > 0) {
          doc.fontSize(10).font('Helvetica-Bold').text('Recent IPCs');
          doc.moveDown(0.2);
          doc.fontSize(8).font('Helvetica');
          for (const ipc of site.ipcRecords) {
            doc.text(`IPC-${String(ipc.ipcNumber).padStart(2, '0')} | ${ipc.status} | Net: $${Number(ipc.netPayable).toFixed(2)}`);
          }
          doc.moveDown(0.5);
        }

        // Recent DPRs
        if (site.dailyReports.length > 0) {
          doc.fontSize(10).font('Helvetica-Bold').text('Recent Daily Reports');
          doc.moveDown(0.2);
          doc.fontSize(8).font('Helvetica');
          for (const dpr of site.dailyReports) {
            doc.text(`${new Date(dpr.reportDate).toLocaleDateString()} | ${dpr.title} | Workers: ${dpr.workersOnSite}`);
          }
        }

        // Footer
        const pageCount = doc.bufferedPageRange().count;
        for (let i = 0; i < pageCount; i++) {
          doc.switchToPage(i);
          doc.fontSize(8).font('Helvetica').fillColor('#999');
          doc.text(
            `Generated by SitePilotIQ | Page ${i + 1} of ${pageCount}`,
            40,
            doc.page.height - 30,
            { align: 'center', width: doc.page.width - 80 },
          );
        }

        doc.end();
      } catch (error) {
        this.logger.error(`Failed to generate site summary PDF: ${error.message}`);
        reject(error);
      }
    });
  }
}
