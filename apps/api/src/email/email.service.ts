import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private config: ConfigService) {
    this.initTransporter();
  }

  private initTransporter() {
    const host = this.config.get<string>('SMTP_HOST');
    const port = this.config.get<number>('SMTP_PORT');
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port: port || 587,
        secure: (port || 587) === 465,
        auth: { user, pass },
      });
      this.logger.log(`Email transport configured: ${host}:${port || 587}`);
    } else {
      this.logger.warn('SMTP not configured - emails will be logged but not sent. Set SMTP_HOST, SMTP_USER, SMTP_PASS in .env');
    }
  }

  async send(options: {
    to: string;
    subject: string;
    text?: string;
    html?: string;
  }): Promise<boolean> {
    const from = this.config.get<string>('SMTP_FROM') || 'noreply@oceanus-crm.com';

    if (!this.transporter) {
      this.logger.log(`[EMAIL-LOG] To: ${options.to} | Subject: ${options.subject} | Body: ${options.text || '(html)'}`);
      return true; // Silently succeed in dev mode
    }

    try {
      await this.transporter.sendMail({
        from,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });
      this.logger.log(`Email sent to ${options.to}: ${options.subject}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email to ${options.to}: ${(error as Error).message}`);
      return false;
    }
  }

  // ─── Convenience methods for CRM events ────────────────────────────────────

  async sendLeadAssigned(to: string, leadRef: string, assigneeName: string) {
    return this.send({
      to,
      subject: `New Lead Assigned: ${leadRef}`,
      html: `<p>Hi ${assigneeName},</p><p>A new lead <strong>${leadRef}</strong> has been assigned to you. Please review it in the CRM.</p><p>- Oceanus CRM</p>`,
    });
  }

  async sendLeadStatusChange(to: string, leadRef: string, newStatus: string) {
    return this.send({
      to,
      subject: `Lead ${leadRef} - Status Updated to ${newStatus}`,
      html: `<p>Lead <strong>${leadRef}</strong> has been moved to <strong>${newStatus}</strong>.</p><p>- Oceanus CRM</p>`,
    });
  }

  async sendInvoiceAction(to: string, invoiceNumber: string, action: string) {
    return this.send({
      to,
      subject: `Invoice ${invoiceNumber} - ${action}`,
      html: `<p>Invoice <strong>${invoiceNumber}</strong> has been <strong>${action.toLowerCase()}</strong>.</p><p>- Oceanus CRM</p>`,
    });
  }

  async sendPolicyIssued(to: string, policyRef: string, customerName: string) {
    return this.send({
      to,
      subject: `Policy Issued: ${policyRef}`,
      html: `<p>Policy <strong>${policyRef}</strong> for customer <strong>${customerName}</strong> has been issued.</p><p>- Oceanus CRM</p>`,
    });
  }

  async sendUwAssignment(to: string, ref: string, underwriterName: string) {
    return this.send({
      to,
      subject: `New UW Assignment: ${ref}`,
      html: `<p>Hi ${underwriterName},</p><p>You have been assigned to process <strong>${ref}</strong>. Please review it in the UW queue.</p><p>- Oceanus CRM</p>`,
    });
  }

  async sendEndorsementUpdate(to: string, endorsementRef: string, action: string) {
    return this.send({
      to,
      subject: `Endorsement ${endorsementRef} - ${action}`,
      html: `<p>Endorsement <strong>${endorsementRef}</strong> - <strong>${action}</strong>.</p><p>- Oceanus CRM</p>`,
    });
  }

  async sendTaskAssigned(to: string, taskTitle: string, leadRef: string, assigneeName: string) {
    return this.send({
      to,
      subject: `New Task: ${taskTitle} — Lead ${leadRef}`,
      html: `<p>Hi ${assigneeName},</p><p>A new task <strong>${taskTitle}</strong> has been assigned to you for lead <strong>${leadRef}</strong>. Please review it in the CRM.</p><p>- Oceanus CRM</p>`,
    });
  }

  async sendTaskReminder(to: string, taskTitle: string, leadRef: string, dueDate: string) {
    return this.send({
      to,
      subject: `Reminder: Task "${taskTitle}" due soon — Lead ${leadRef}`,
      html: `<p>Your task <strong>${taskTitle}</strong> for lead <strong>${leadRef}</strong> is due at <strong>${dueDate}</strong>. Please take action soon.</p><p>- Oceanus CRM</p>`,
    });
  }

  async sendTaskOverdue(to: string, taskTitle: string, leadRef: string, dueDate: string) {
    return this.send({
      to,
      subject: `Overdue: Task "${taskTitle}" — Lead ${leadRef}`,
      html: `<p>Your task <strong>${taskTitle}</strong> for lead <strong>${leadRef}</strong> was due at <strong>${dueDate}</strong> and is now overdue. Please take immediate action.</p><p>- Oceanus CRM</p>`,
    });
  }

  async sendLeadTransferred(to: string, leadRef: string, fromName: string, toName: string) {
    return this.send({
      to,
      subject: `Lead Transferred: ${leadRef}`,
      html: `<p>Hi ${toName},</p><p>Lead <strong>${leadRef}</strong> has been transferred to you from <strong>${fromName}</strong>. Please review it in the CRM.</p><p>- Oceanus CRM</p>`,
    });
  }
}
