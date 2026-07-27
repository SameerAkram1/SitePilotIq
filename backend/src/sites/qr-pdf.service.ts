import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import PDFDocument from 'pdfkit';
import * as QRCode from 'qrcode';
import { createHmac } from 'crypto';

export interface QrPdfData {
  siteId: string;
  tenantId: string;
  qrCodeToken: string;
  siteName: string;
  siteCode: string;
  projectName: string;
  companyName: string;
  logoUrl?: string;
}

@Injectable()
export class QrPdfService {
  private readonly logger = new Logger(QrPdfService.name);

  constructor(private readonly config: ConfigService) {}

  private signPayload(payload: { siteId: string; tenantId: string; token: string }): string {
    const secret = this.config.get<string>('ENCRYPTION_KEY') || '';
    const data = `${payload.siteId}:${payload.tenantId}:${payload.token}`;
    return createHmac('sha256', secret).update(data).digest('hex');
  }

  /**
   * Generate a single-page PDF with QR code for site signage.
   * QR contains the same signed payload used for attendance check-in.
   * Returns PDF as buffer (generated on-demand, not stored).
   */
  async generateQrPdf(data: QrPdfData): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 50,
        });

        const chunks: Buffer[] = [];
        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Company name header
        doc.fontSize(24).font('Helvetica-Bold').text(data.companyName, {
          align: 'center',
        });

        doc.moveDown(0.5);

        // Site name
        doc.fontSize(18).font('Helvetica-Bold').text(data.siteName, {
          align: 'center',
        });

        // Site code
        doc
          .fontSize(12)
          .font('Helvetica')
          .text(data.siteCode, { align: 'center' });

        doc.moveDown(1);

        // Generate signed QR payload (same format as QrCodeService)
        const qrPayload = {
          siteId: data.siteId,
          tenantId: data.tenantId,
          token: data.qrCodeToken,
          sig: '',
        };
        qrPayload.sig = this.signPayload(qrPayload);

        const encoded = Buffer.from(JSON.stringify(qrPayload)).toString('base64');

        // Generate QR code as buffer
        const qrBuffer = await QRCode.toBuffer(encoded, {
          type: 'png',
          width: 300,
          margin: 2,
        });

        // Center the QR code
        const qrWidth = 250;
        const qrHeight = 250;
        const centerX = (doc.page.width - qrWidth) / 2;

        doc.image(qrBuffer, centerX, doc.y, {
          width: qrWidth,
          height: qrHeight,
        });

        doc.y += qrHeight + 20;

        // "Scan to check in" text
        doc
          .fontSize(14)
          .font('Helvetica-Bold')
          .text('Scan to check in', { align: 'center' });

        doc.moveDown(0.5);

        // Project name
        doc
          .fontSize(10)
          .font('Helvetica')
          .fillColor('#666666')
          .text(`Project: ${data.projectName}`, { align: 'center' });

        // Generated date
        doc
          .fontSize(8)
          .fillColor('#999999')
          .text(`Generated: ${new Date().toLocaleDateString()}`, {
            align: 'center',
          });

        doc.end();
      } catch (error) {
        this.logger.error(`Failed to generate QR PDF: ${error.message}`);
        reject(error);
      }
    });
  }
}
