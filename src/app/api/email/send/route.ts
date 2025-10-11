/**
 * API Route: Send Email via Customer's SMTP
 * POST /api/email/send
 */

import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { getEmailConfig, decryptPassword } from '@/services/emailIntegrationService.server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyId, to, subject, html, text, attachments } = body;

    if (!companyId || !to || !subject) {
      return NextResponse.json(
        {
          success: false,
          message: 'Fehlende Pflichtfelder',
        },
        { status: 400 }
      );
    }

    // Get email configuration
    const emailConfig = await getEmailConfig(companyId);

    if (!emailConfig || !emailConfig.settings.enabled) {
      return NextResponse.json(
        {
          success: false,
          message: 'E-Mail-Integration nicht konfiguriert oder deaktiviert',
        },
        { status: 400 }
      );
    }

    // Decrypt password
    const smtpPassword = decryptPassword(emailConfig.smtp.password);

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: emailConfig.smtp.host,
      port: emailConfig.smtp.port,
      secure: emailConfig.smtp.secure,
      auth: {
        user: emailConfig.smtp.username,
        pass: smtpPassword,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    // Send email
    const info = await transporter.sendMail({
      from: `"${emailConfig.smtp.fromName}" <${emailConfig.smtp.fromEmail}>`,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      text,
      html,
      attachments,
    });

    return NextResponse.json({
      success: true,
      message: 'E-Mail erfolgreich gesendet',
      messageId: info.messageId,
    });
  } catch (error: any) {
    console.error('Send email error:', error);
    return NextResponse.json(
      {
        success: false,
        message: `E-Mail-Versand fehlgeschlagen: ${error.message}`,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
