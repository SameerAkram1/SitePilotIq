import { Injectable, Logger } from '@nestjs/common';
import PDFDocument from 'pdfkit';

export interface IpcPdfData {
  ipcNumber: number;
  billingStartDate: string;
  billingEndDate: string;
  status: string;
  isFinal: boolean;
  siteName: string;
  siteCode: string;
  projectName: string;
  currencyCode: string;
  retentionPercentage: number;
  advanceRecoveryAmount: number;
  lineItems: {
    itemCode: string;
    description: string;
    unit: string;
    boqQuantity: number;
    boqUnitRate: number;
    previousQuantity: number;
    previousAmount: number;
    currentQuantity: number;
    currentAmount: number;
    cumulativeQuantity: number;
    cumulativeAmount: number;
    certifiedQuantity?: number | null;
    certifiedAmount?: number | null;
  }[];
  grossClaimed: number;
  retentionDeduction: number;
  netPayable: number;
  certifiedGross?: number | null;
  certifiedRetention?: number | null;
  certifiedNetPayable?: number | null;
  totalPaid?: number;
  companyName?: string;
}

@Injectable()
export class IpcPdfService {
  private readonly logger = new Logger(IpcPdfService.name);

  async generateIpcPdf(data: IpcPdfData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 40,
          bufferPages: true,
        });

        const chunks: Buffer[] = [];
        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        const currency = data.currencyCode || 'USD';
        const formatAmount = (amount: number) =>
          `${currency} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

        // Header
        doc.fontSize(16).font('Helvetica-Bold').text(data.companyName || 'SitePilotIQ', { align: 'center' });
        doc.moveDown(0.3);
        doc.fontSize(12).font('Helvetica-Bold').text('Interim Payment Certificate', { align: 'center' });
        doc.moveDown(0.5);

        // IPC Info Box
        const boxY = doc.y;
        doc.rect(40, boxY, doc.page.width - 80, 60).stroke('#cccccc');
        doc.fontSize(10).font('Helvetica-Bold');
        doc.text(`IPC-${String(data.ipcNumber).padStart(2, '0')}`, 50, boxY + 10);
        doc.text(`Status: ${data.status}`, 50, boxY + 25);
        doc.text(`Final: ${data.isFinal ? 'Yes' : 'No'}`, 50, boxY + 40);
        doc.text(`Site: ${data.siteCode} - ${data.siteName}`, 250, boxY + 10);
        doc.text(`Project: ${data.projectName}`, 250, boxY + 25);
        doc.text(`Period: ${data.billingStartDate} to ${data.billingEndDate}`, 250, boxY + 40);
        doc.y = boxY + 70;

        // Line Items Table
        doc.fontSize(10).font('Helvetica-Bold').text('Bill of Quantities', { underline: true });
        doc.moveDown(0.3);

        const tableTop = doc.y;
        const colWidths = [55, 100, 35, 50, 50, 50, 50, 50, 55];
        const headers = ['Item', 'Description', 'Unit', 'BOQ Qty', 'Prev Qty', 'Curr Qty', 'Curr Amt', 'Cum Qty', 'Cum Amt'];
        const colX = [40];
        let x = 40;
        for (const w of colWidths) {
          colX.push(x + w);
          x += w;
        }

        // Table header
        doc.fontSize(7).font('Helvetica-Bold');
        let rowY = tableTop;
        doc.rect(40, rowY, doc.page.width - 80, 18).fill('#f0f0f0');
        doc.fillColor('#000000');
        headers.forEach((h, i) => {
          doc.text(h, colX[i] + 2, rowY + 4, { width: colWidths[i] - 4, align: i === 0 ? 'left' : 'right' });
        });
        rowY += 18;

        // Table rows
        doc.font('Helvetica').fontSize(7);
        for (const item of data.lineItems) {
          if (rowY > doc.page.height - 100) {
            doc.addPage();
            rowY = 40;
          }

          const rowHeight = 14;
          if (data.lineItems.indexOf(item) % 2 === 0) {
            doc.rect(40, rowY, doc.page.width - 80, rowHeight).fill('#fafafa');
            doc.fillColor('#000000');
          }

          doc.text(item.itemCode, colX[0] + 2, rowY + 3, { width: colWidths[0] - 4, ellipsis: true });
          doc.text(item.description, colX[1] + 2, rowY + 3, { width: colWidths[1] - 4, ellipsis: true });
          doc.text(item.unit, colX[2] + 2, rowY + 3, { width: colWidths[2] - 4, align: 'right' });
          doc.text(Number(item.boqQuantity).toLocaleString(), colX[3] + 2, rowY + 3, { width: colWidths[3] - 4, align: 'right' });
          doc.text(Number(item.previousQuantity).toLocaleString(), colX[4] + 2, rowY + 3, { width: colWidths[4] - 4, align: 'right' });
          doc.text(Number(item.currentQuantity).toLocaleString(), colX[5] + 2, rowY + 3, { width: colWidths[5] - 4, align: 'right' });
          doc.text(formatAmount(Number(item.currentAmount)), colX[6] + 2, rowY + 3, { width: colWidths[6] - 4, align: 'right' });
          doc.text(Number(item.cumulativeQuantity).toLocaleString(), colX[7] + 2, rowY + 3, { width: colWidths[7] - 4, align: 'right' });
          doc.text(formatAmount(Number(item.cumulativeAmount)), colX[8] + 2, rowY + 3, { width: colWidths[8] - 4, align: 'right' });

          rowY += rowHeight;
        }

        doc.y = rowY + 10;

        // Financial Summary
        doc.fontSize(10).font('Helvetica-Bold').text('Financial Summary', { underline: true });
        doc.moveDown(0.3);

        const summaryX = 400;
        const summaryWidth = doc.page.width - 80;
        doc.fontSize(9).font('Helvetica');

        const addSummaryLine = (label: string, value: string, bold = false) => {
          doc.font(bold ? 'Helvetica-Bold' : 'Helvetica');
          doc.text(label, summaryX, doc.y, { width: summaryWidth - 120, align: 'left' });
          doc.text(value, summaryX + summaryWidth - 120, doc.y - 12, { width: 120, align: 'right' });
        };

        addSummaryLine('Gross Claimed:', formatAmount(data.grossClaimed));
        addSummaryLine(`Less Retention (${data.retentionPercentage}%):`, formatAmount(data.retentionDeduction));
        addSummaryLine('Less Advance Recovery:', formatAmount(data.advanceRecoveryAmount));
        doc.moveTo(summaryX, doc.y + 2).lineTo(summaryX + summaryWidth, doc.y + 2).stroke();
        doc.moveDown(0.5);
        addSummaryLine('Net Payable:', formatAmount(data.netPayable), true);
        doc.moveDown(1);

        // Certified Figures (if available)
        if (data.certifiedGross != null) {
          doc.fontSize(10).font('Helvetica-Bold').text('Certified Figures', { underline: true });
          doc.moveDown(0.3);
          doc.fontSize(9).font('Helvetica');
          addSummaryLine('Certified Gross:', formatAmount(Number(data.certifiedGross)));
          addSummaryLine('Certified Retention:', formatAmount(Number(data.certifiedRetention || 0)));
          doc.moveTo(summaryX, doc.y + 2).lineTo(summaryX + summaryWidth, doc.y + 2).stroke();
          doc.moveDown(0.5);
          addSummaryLine('Certified Net Payable:', formatAmount(Number(data.certifiedNetPayable || 0)), true);
          doc.moveDown(1);
        }

        // Payment History (if available)
        if (data.totalPaid && data.totalPaid > 0) {
          doc.fontSize(10).font('Helvetica-Bold').text('Payment Summary', { underline: true });
          doc.moveDown(0.3);
          doc.fontSize(9).font('Helvetica');
          addSummaryLine('Total Paid:', formatAmount(data.totalPaid));
          const balance = data.certifiedNetPayable ? Number(data.certifiedNetPayable) - data.totalPaid : data.netPayable - data.totalPaid;
          addSummaryLine('Remaining Balance:', formatAmount(Math.max(0, balance)));
          doc.moveDown(1);
        }

        // Footer
        const pageCount = doc.bufferedPageRange().count;
        for (let i = 0; i < pageCount; i++) {
          doc.switchToPage(i);
          doc.fontSize(7).font('Helvetica').fillColor('#999999');
          doc.text(
            `Generated by SitePilotIQ — Page ${i + 1} of ${pageCount}`,
            40,
            doc.page.height - 30,
            { align: 'center', width: doc.page.width - 80 },
          );
        }

        doc.end();
      } catch (error) {
        this.logger.error(`Failed to generate IPC PDF: ${error.message}`);
        reject(error);
      }
    });
  }
}
