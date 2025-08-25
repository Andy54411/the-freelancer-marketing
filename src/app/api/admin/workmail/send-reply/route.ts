import { NextRequest, NextResponse } from 'next/server';
import * as nodemailer from 'nodemailer';
import { verify } from 'jsonwebtoken';

const JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'admin-secret-2024';

// WorkMail SMTP Configuration
const WORKMAIL_SMTP_CONFIG = {
  host: 'smtp.mail.us-east-1.awsapps.com',
  port: 465,
  secure: true,
  auth: {
    user: 'andy@taskilo.de',
    pass: process.env.WORKMAIL_ANDY_PASSWORD || '',
  },
};

interface QuickReplyData {
  to: string;
  subject: string;
  message: string;
}

export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication via cookies
    const token = request.cookies.get('admin-auth')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    try {
      verify(token, JWT_SECRET);
    } catch (error) {

      return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 });
    }

    const replyData: QuickReplyData = await request.json();

    if (!replyData.to || !replyData.subject || !replyData.message) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject, message' },
        { status: 400 }
      );
    }

    // Create nodemailer transporter with WorkMail SMTP
    const transporter = nodemailer.createTransport(WORKMAIL_SMTP_CONFIG);

    // Verify connection
    await transporter.verify();

    // Send email
    const info = await transporter.sendMail({
      from: 'andy@taskilo.de',
      to: replyData.to,
      subject: replyData.subject,
      text: replyData.message,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="white-space: pre-wrap;">${replyData.message.replace(/\n/g, '<br>')}</div>
          <br><br>
          <div style="border-top: 1px solid #ccc; padding-top: 10px; font-size: 12px; color: #666;">
            <p>Diese E-Mail wurde über das Taskilo Admin-Dashboard gesendet.</p>
            <p><strong>Taskilo Support Team</strong><br>
            andy@taskilo.de<br>
            https://taskilo.de</p>
          </div>
        </div>
      `,
    });

    return NextResponse.json({
      success: true,
      messageId: info.messageId,
      message: 'E-Mail erfolgreich gesendet',
    });
  } catch (error) {

    return NextResponse.json(
      {
        error: 'Failed to send email reply',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
