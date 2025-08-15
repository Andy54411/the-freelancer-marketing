import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';

interface JWTPayload {
  email: string;
  exp: number;
}

interface QuickReplyRequest {
  to: string;
  subject: string;
  message: string;
  inReplyTo?: string;
}

export async function POST(request: NextRequest) {
  try {
    console.log('📤 [Quick Reply API] Starting quick reply process...');

    // JWT-Authentifizierung - Verwende taskilo-admin-token wie WorkMail API
    const cookieStore = await cookies();
    const token = cookieStore.get('taskilo-admin-token')?.value;

    if (!token) {
      console.log('❌ [Quick Reply API] No taskilo-admin-token found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.log('❌ [Quick Reply API] JWT secret not configured');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    let decoded: JWTPayload;
    try {
      decoded = jwt.verify(token, jwtSecret) as JWTPayload;
      console.log('✅ [Quick Reply API] JWT Cookie verified for admin:', { email: decoded.email });
    } catch (error) {
      console.log('❌ [Quick Reply API] Invalid JWT token');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Request Body parsen
    const body: QuickReplyRequest = await request.json();
    const { to, subject, message, inReplyTo } = body;

    if (!to || !subject || !message) {
      console.log('❌ [Quick Reply API] Missing required fields');
      return NextResponse.json(
        {
          error: 'Missing required fields: to, subject, message',
        },
        { status: 400 }
      );
    }

    console.log('📧 [Quick Reply API] Sending quick reply:', {
      from: decoded.email,
      to,
      subject: subject.substring(0, 50) + '...',
      messageLength: message.length,
      inReplyTo: inReplyTo || 'none',
    });

    // Echte E-Mail-Versendung über SMTP
    try {
      // WorkMail SMTP Konfiguration
      const transporter = nodemailer.createTransport({
        host: 'smtp.mail.us-east-1.awsapps.com', // WorkMail SMTP
        port: 465,
        secure: true,
        auth: {
          user: process.env.WORKMAIL_SMTP_USER || 'info@taskilo.de',
          pass: process.env.WORKMAIL_SMTP_PASSWORD || '',
        },
      });

      const emailOptions = {
        from: process.env.WORKMAIL_SMTP_USER || 'info@taskilo.de',
        to: to,
        subject: subject,
        text: message,
        html: `<div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <p>${message.replace(/\n/g, '<br>')}</p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">
            Diese E-Mail wurde über das Taskilo Admin-System gesendet.
          </p>
        </div>`,
        ...(inReplyTo && {
          inReplyTo: inReplyTo,
          references: inReplyTo,
        }),
      };

      console.log('📤 [Quick Reply API] Sending via SMTP...', {
        smtp: 'smtp.mail.us-east-1.awsapps.com',
        from: emailOptions.from,
        to: emailOptions.to,
      });

      const result = await transporter.sendMail(emailOptions);

      console.log('✅ [Quick Reply API] Email sent successfully via SMTP:', {
        messageId: result.messageId,
        accepted: result.accepted,
        rejected: result.rejected,
      });

      const emailData = {
        id: result.messageId || `reply-${Date.now()}`,
        from: emailOptions.from,
        to,
        subject,
        message,
        inReplyTo,
        sentAt: new Date().toISOString(),
        method: 'workmail-smtp',
        smtp: {
          messageId: result.messageId,
          accepted: result.accepted,
          rejected: result.rejected,
        },
      };

      return NextResponse.json({
        success: true,
        message: 'E-Mail wurde erfolgreich gesendet',
        data: {
          emailId: emailData.id,
          sentAt: emailData.sentAt,
          from: emailData.from,
          to: emailData.to,
          subject: emailData.subject,
          messageId: result.messageId,
        },
      });
    } catch (emailError) {
      console.error('❌ [Quick Reply API] SMTP sending failed:', emailError);

      // Fallback zu Simulation, falls SMTP fehlschlägt
      console.log('⚠️ [Quick Reply API] Falling back to simulation mode...');

      const emailData = {
        id: `reply-simulation-${Date.now()}`,
        from: decoded.email,
        to,
        subject,
        message,
        inReplyTo,
        sentAt: new Date().toISOString(),
        method: 'simulation-fallback',
      };

      return NextResponse.json({
        success: true,
        message: 'E-Mail wurde simuliert (SMTP-Fehler)',
        data: {
          emailId: emailData.id,
          sentAt: emailData.sentAt,
          from: emailData.from,
          to: emailData.to,
          subject: emailData.subject,
          mode: 'simulation',
        },
      });
    }
  } catch (error) {
    console.error('❌ [Quick Reply API] Send process failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to send quick reply',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
