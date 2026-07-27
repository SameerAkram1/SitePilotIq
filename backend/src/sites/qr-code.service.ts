import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as QRCode from 'qrcode';
import { createHmac, randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { createClient } from '@supabase/supabase-js';

export interface QrPayload {
  siteId: string;
  tenantId: string;
  token: string;
  sig: string;
}

interface SignedPayload {
  payload: QrPayload;
  signature: string;
}

@Injectable()
export class QrCodeService {
  private readonly logger = new Logger(QrCodeService.name);
  private supabase;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    const url = this.config.get('SUPABASE_URL');
    const key = this.config.get('SUPABASE_SERVICE_ROLE_KEY');
    if (url && key) {
      this.supabase = createClient(url, key);
    }
  }

  private signPayload(payload: QrPayload): string {
    const secret = this.config.get<string>('ENCRYPTION_KEY') || '';
    const data = `${payload.siteId}:${payload.tenantId}:${payload.token}`;
    return createHmac('sha256', secret).update(data).digest('hex');
  }

  /**
   * Generate QR code image for a site.
   * QR content is an HMAC-signed payload to prevent forgery.
   */
  async generateQrCodeImage(site: {
    id: string;
    tenantId: string;
    qrCodeToken: string;
  }): Promise<string> {
    const payload: QrPayload = {
      siteId: site.id,
      tenantId: site.tenantId,
      token: site.qrCodeToken,
      sig: '',
    };
    payload.sig = this.signPayload(payload);

    const encoded = Buffer.from(JSON.stringify(payload)).toString('base64');

    const qrBuffer = await QRCode.toBuffer(encoded, {
      type: 'png',
      width: 400,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });

    const filePath = `${site.tenantId}/${site.id}.png`;

    if (this.supabase) {
      const { error } = await this.supabase.storage
        .from('site-qr-codes')
        .upload(filePath, qrBuffer, {
          contentType: 'image/png',
          upsert: true,
        });

      if (error) {
        this.logger.error(`Failed to upload QR code: ${error.message}`);
        throw error;
      }

      const { data: urlData } = this.supabase.storage
        .from('site-qr-codes')
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    }

    return `data:image/png;base64,${qrBuffer.toString('base64')}`;
  }

  /**
   * Regenerate QR code for a site (invalidates old QR).
   * ADMIN or SITE_MANAGER only.
   */
  async regenerateQrCode(
    tenantId: string,
    siteId: string,
    userId: string,
  ): Promise<{ qrCodeImageUrl: string }> {
    const newToken = randomUUID();

    const site = await this.prisma.site.update({
      where: { id: siteId },
      data: {
        qrCodeToken: newToken,
        qrCodeGeneratedAt: new Date(),
      },
    });

    const qrCodeImageUrl = await this.generateQrCodeImage({
      id: site.id,
      tenantId: site.tenantId,
      qrCodeToken: newToken,
    });

    try {
      await this.prisma.auditLog.create({
        data: {
          tenantId,
          userId,
          action: 'SITE_QR_REGENERATED',
          module: 'SITES',
          recordId: siteId,
        },
      });
    } catch (e) {
      this.logger.warn(`Failed to create audit log: ${e.message}`);
    }

    return { qrCodeImageUrl };
  }

  /**
   * Validate a QR payload (used by mobile attendance).
   * Verifies HMAC signature before checking token in DB.
   */
  async validateQrPayload(
    payload: QrPayload,
  ): Promise<{ siteId: string; tenantId: string } | null> {
    const expectedSig = this.signPayload({
      siteId: payload.siteId,
      tenantId: payload.tenantId,
      token: payload.token,
      sig: '',
    });

    if (payload.sig !== expectedSig) {
      this.logger.warn('QR payload signature verification failed');
      return null;
    }

    const site = await this.prisma.site.findFirst({
      where: {
        id: payload.siteId,
        tenantId: payload.tenantId,
        qrCodeToken: payload.token,
        isDeleted: false,
      },
      select: { id: true, tenantId: true },
    });

    return site ? { siteId: site.id, tenantId: site.tenantId } : null;
  }
}
