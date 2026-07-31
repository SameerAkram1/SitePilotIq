import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { I18nService } from '../i18n/i18n.service';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: nodemailer.Transporter;
  private readonly frontendUrl: string;
  private readonly fromEmail: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly i18n: I18nService,
  ) {
    this.frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    this.fromEmail = this.configService.get<string>('EMAIL_FROM') || `SitePilotIQ <${this.configService.get<string>('SMTP_USER')}>`;

    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST') || 'smtp.gmail.com',
      port: parseInt(this.configService.get<string>('SMTP_PORT') || '587'),
      secure: false,
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
    });
  }

  async sendVerificationEmail(to: string, fullName: string, token: string, locale?: string): Promise<void> {
    const link = `${this.frontendUrl}/verify-email?token=${token}`;
    await this.sendEmail({
      to,
      subject: this.i18n.translate('auth.email.verifySubject', {}, locale),
      html: this.verificationTemplate(fullName, link),
      text: this.i18n.translate('auth.email.verifyBody', { name: fullName, link }, locale),
    });
  }

  async sendInvitationEmail(to: string, inviterName: string, companyName: string, role: string, token: string, locale?: string): Promise<void> {
    const link = `${this.frontendUrl}/accept-invitation?token=${token}`;
    await this.sendEmail({
      to,
      subject: this.i18n.translate('auth.email.inviteSubject', { inviter: inviterName, company: companyName }, locale),
      html: this.invitationTemplate(inviterName, companyName, role, link),
      text: this.i18n.translate('auth.email.inviteBody', { inviter: inviterName, company: companyName, role, link }, locale),
    });
  }

  async sendWelcomeEmail(to: string, fullName: string, companyName: string, locale?: string): Promise<void> {
    await this.sendEmail({
      to,
      subject: this.i18n.translate('auth.email.welcomeSubject', {}, locale),
      html: this.welcomeTemplate(fullName, companyName),
      text: this.i18n.translate('auth.email.welcomeBody', { name: fullName, company: companyName }, locale),
    });
  }

  async sendPasswordResetEmail(to: string, fullName: string, token: string, locale?: string): Promise<void> {
    const link = `${this.frontendUrl}/reset-password?token=${token}`;
    await this.sendEmail({
      to,
      subject: this.i18n.translate('auth.email.resetSubject', {}, locale),
      html: this.passwordResetTemplate(fullName, link),
      text: this.i18n.translate('auth.email.resetBody', { name: fullName, link }, locale),
    });
  }

  async sendIpcSubmittedEmail(to: string, ipcNumber: string, siteName: string, submittedBy: string, locale?: string): Promise<void> {
    await this.sendEmail({
      to,
      subject: `IPC-${ipcNumber} submitted for certification — ${siteName}`,
      html: this.ipcStatusTemplate(`IPC-${ipcNumber}`, 'Submitted for Certification', siteName, submittedBy, 'submitted'),
      text: `IPC-${ipcNumber} has been submitted for certification on site ${siteName} by ${submittedBy}.`,
    });
  }

  async sendIpcCertifiedEmail(to: string, ipcNumber: string, siteName: string, certifiedBy: string, netPayable: string, locale?: string): Promise<void> {
    await this.sendEmail({
      to,
      subject: `IPC-${ipcNumber} certified — ${siteName}`,
      html: this.ipcStatusTemplate(`IPC-${ipcNumber}`, 'Certified', siteName, certifiedBy, 'certified', netPayable),
      text: `IPC-${ipcNumber} has been certified on site ${siteName} by ${certifiedBy}. Net payable: ${netPayable}.`,
    });
  }

  async sendIpcPaidEmail(to: string, ipcNumber: string, siteName: string, locale?: string): Promise<void> {
    await this.sendEmail({
      to,
      subject: `IPC-${ipcNumber} payment recorded — ${siteName}`,
      html: this.ipcStatusTemplate(`IPC-${ipcNumber}`, 'Payment Recorded', siteName, undefined, 'paid'),
      text: `Payment has been recorded for IPC-${ipcNumber} on site ${siteName}.`,
    });
  }

  async sendIpcRejectedEmail(to: string, ipcNumber: string, siteName: string, rejectedBy: string, reason: string, locale?: string): Promise<void> {
    await this.sendEmail({
      to,
      subject: `IPC-${ipcNumber} rejected — ${siteName}`,
      html: this.ipcRejectionTemplate(`IPC-${ipcNumber}`, siteName, rejectedBy, reason),
      text: `IPC-${ipcNumber} has been rejected on site ${siteName} by ${rejectedBy}. Reason: ${reason || 'No reason provided'}.`,
    });
  }

  private async sendEmail(options: { to: string; subject: string; html: string; text: string }): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.fromEmail,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });
      this.logger.log(`Email sent to ${options.to}: ${options.subject}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${options.to}: ${error.message}`);
    }
  }

  private verificationTemplate(fullName: string, link: string): string {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;margin:0;padding:0;background:#f5f5f5}.container{max-width:600px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)}.header{background:linear-gradient(135deg,#3b82f6,#6366f1);padding:32px;text-align:center}.header h1{color:#fff;margin:0;font-size:24px}.content{padding:32px}.content h2{color:#1e293b;margin-top:0}.content p{color:#475569;line-height:1.6}.btn{display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#3b82f6,#6366f1);color:#fff;text-decoration:none;border-radius:8px;font-weight:600;margin:16px 0}.footer{padding:24px 32px;background:#f8fafc;text-align:center;color:#94a3b8;font-size:12px}</style></head><body><div class="container"><div class="header"><h1>SitePilotIQ</h1></div><div class="content"><h2>Verify your email</h2><p>Hi ${fullName},</p><p>Welcome to SitePilotIQ! Please verify your email address to get started.</p><p style="text-align:center"><a href="${link}" class="btn">Verify Email Address</a></p><p>This link expires in 24 hours.</p></div><div class="footer">SitePilotIQ - Construction Management Platform</div></div></body></html>`;
  }

  private invitationTemplate(inviterName: string, companyName: string, role: string, link: string): string {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;margin:0;padding:0;background:#f5f5f5}.container{max-width:600px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)}.header{background:linear-gradient(135deg,#3b82f6,#6366f1);padding:32px;text-align:center}.header h1{color:#fff;margin:0;font-size:24px}.content{padding:32px}.content h2{color:#1e293b;margin-top:0}.content p{color:#475569;line-height:1.6}.btn{display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#3b82f6,#6366f1);color:#fff;text-decoration:none;border-radius:8px;font-weight:600;margin:16px 0}.footer{padding:24px 32px;background:#f8fafc;text-align:center;color:#94a3b8;font-size:12px}</style></head><body><div class="container"><div class="header"><h1>SitePilotIQ</h1></div><div class="content"><h2>You're invited!</h2><p><strong>${inviterName}</strong> has invited you to join <strong>${companyName}</strong> on SitePilotIQ as <strong>${role}</strong>.</p><p style="text-align:center"><a href="${link}" class="btn">Accept Invitation</a></p><p>This link expires in 48 hours.</p></div><div class="footer">SitePilotIQ - Construction Management Platform</div></div></body></html>`;
  }

  private welcomeTemplate(fullName: string, companyName: string): string {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;margin:0;padding:0;background:#f5f5f5}.container{max-width:600px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)}.header{background:linear-gradient(135deg,#3b82f6,#6366f1);padding:32px;text-align:center}.header h1{color:#fff;margin:0;font-size:24px}.content{padding:32px}.content h2{color:#1e293b;margin-top:0}.content p{color:#475569;line-height:1.6}.btn{display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#3b82f6,#6366f1);color:#fff;text-decoration:none;border-radius:8px;font-weight:600;margin:16px 0}.footer{padding:24px 32px;background:#f8fafc;text-align:center;color:#94a3b8;font-size:12px}</style></head><body><div class="container"><div class="header"><h1>Welcome to SitePilotIQ!</h1></div><div class="content"><h2>You're all set!</h2><p>Hi ${fullName},</p><p>Your company <strong>${companyName}</strong> has been created on SitePilotIQ. Your 14-day free trial is active.</p><h3>Getting started:</h3><ul><li>Configure your company settings</li><li>Invite your team members</li><li>Create your first project</li></ul><p style="text-align:center"><a href="${this.frontendUrl}/dashboard" class="btn">Go to Dashboard</a></p></div><div class="footer">SitePilotIQ - Construction Management Platform</div></div></body></html>`;
  }

  private passwordResetTemplate(fullName: string, link: string): string {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;margin:0;padding:0;background:#f5f5f5}.container{max-width:600px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)}.header{background:linear-gradient(135deg,#3b82f6,#6366f1);padding:32px;text-align:center}.header h1{color:#fff;margin:0;font-size:24px}.content{padding:32px}.content h2{color:#1e293b;margin-top:0}.content p{color:#475569;line-height:1.6}.btn{display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#3b82f6,#6366f1);color:#fff;text-decoration:none;border-radius:8px;font-weight:600;margin:16px 0}.footer{padding:24px 32px;background:#f8fafc;text-align:center;color:#94a3b8;font-size:12px}</style></head><body><div class="container"><div class="header"><h1>SitePilotIQ</h1></div><div class="content"><h2>Reset your password</h2><p>Hi ${fullName},</p><p>Click the button below to reset your password.</p><p style="text-align:center"><a href="${link}" class="btn">Reset Password</a></p><p>This link expires in 1 hour. If you didn't request this, ignore this email.</p></div><div class="footer">SitePilotIQ - Construction Management Platform</div></div></body></html>`;
  }

  private ipcStatusTemplate(ipcLabel: string, statusText: string, siteName: string, actorName?: string, type?: string, netPayable?: string): string {
    const statusColors: Record<string, string> = {
      submitted: '#3b82f6',
      certified: '#22c55e',
      paid: '#8b5cf6',
      rejected: '#ef4444',
    };
    const color = statusColors[type || 'submitted'] || '#3b82f6';
    const actorLine = actorName ? `<p><strong>${actorName}</strong> has ${type === 'certified' ? 'certified' : type === 'rejected' ? 'rejected' : 'submitted'} this IPC.</p>` : '';
    const amountLine = netPayable ? `<p style="font-size:20px;font-weight:bold;color:#1e293b;margin:16px 0">${netPayable}</p>` : '';

    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;margin:0;padding:0;background:#f5f5f5}.container{max-width:600px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)}.header{background:linear-gradient(135deg,${color},${color}dd);padding:32px;text-align:center}.header h1{color:#fff;margin:0;font-size:24px}.content{padding:32px}.content h2{color:#1e293b;margin-top:0}.content p{color:#475569;line-height:1.6}.badge{display:inline-block;padding:6px 16px;background:${color}20;color:${color};border-radius:20px;font-weight:600;font-size:14px}.footer{padding:24px 32px;background:#f8fafc;text-align:center;color:#94a3b8;font-size:12px}</style></head><body><div class="container"><div class="header"><h1>SitePilotIQ</h1></div><div class="content"><h2>${ipcLabel} — ${statusText}</h2><p>Site: <strong>${siteName}</strong></p><p><span class="badge">${statusText}</span></p>${actorLine}${amountLine}<p>Log in to SitePilotIQ to view details.</p></div><div class="footer">SitePilotIQ - Construction Management Platform</div></div></body></html>`;
  }

  private ipcRejectionTemplate(ipcLabel: string, siteName: string, rejectedBy: string, reason: string): string {
    const reasonBlock = reason
      ? `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin:16px 0"><p style="color:#991b1b;font-weight:600;margin:0 0 8px 0">Rejection Reason</p><p style="color:#7f1d1d;margin:0">${reason}</p></div>`
      : '';

    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;margin:0;padding:0;background:#f5f5f5}.container{max-width:600px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)}.header{background:linear-gradient(135deg,#ef4444,#dc2626);padding:32px;text-align:center}.header h1{color:#fff;margin:0;font-size:24px}.content{padding:32px}.content h2{color:#1e293b;margin-top:0}.content p{color:#475569;line-height:1.6}.badge{display:inline-block;padding:6px 16px;background:#ef444420;color:#ef4444;border-radius:20px;font-weight:600;font-size:14px}.footer{padding:24px 32px;background:#f8fafc;text-align:center;color:#94a3b8;font-size:12px}</style></head><body><div class="container"><div class="header"><h1>SitePilotIQ</h1></div><div class="content"><h2>${ipcLabel} — Rejected</h2><p>Site: <strong>${siteName}</strong></p><p><span class="badge">Rejected</span></p><p><strong>${rejectedBy}</strong> has rejected this IPC.</p>${reasonBlock}<p>Please review the feedback, make corrections, and resubmit.</p><p>Log in to SitePilotIQ to view details.</p></div><div class="footer">SitePilotIQ - Construction Management Platform</div></div></body></html>`;
  }
}
