import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: NextRequest) {
  try {
    const { to, subject, htmlContent, textContent, from } = await request.json();

    // Validation
    if (!to || !subject) {
      return NextResponse.json(
        { success: false, error: 'Empfänger und Betreff sind erforderlich' },
        { status: 400 }
      );
    }

    // Für Development/Testing: Verwende Standard WorkMail Credentials
    const workmailCredentials = {
      email: 'support@taskilo.de',
      password: process.env.WORKMAIL_SUPPORT_PASSWORD || 'demo_password',
    };

    console.log('WorkMail API called with:', { to, subject, from });
    console.log('Using credentials for:', workmailCredentials.email);

    // Für Development: Simuliere E-Mail-Versand ohne echte SMTP-Verbindung
    if (process.env.NODE_ENV === 'development') {
      // Development Mode: Simuliere erfolgreichen E-Mail-Versand
      console.log('=== DEVELOPMENT MODE: E-Mail Simulation ===');
      console.log('Von:', from || workmailCredentials.email);
      console.log('An:', to);
      console.log('Betreff:', subject);
      console.log('HTML:', htmlContent?.substring(0, 100) + '...');
      console.log('Text:', textContent?.substring(0, 100) + '...');
      console.log('==========================================');

      return NextResponse.json({
        success: true,
        messageId: `dev_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        response: 'Development mode: E-Mail simulation successful',
        sender: workmailCredentials.email,
        mode: 'development',
      });
    }

    // Production Mode: Echte WorkMail SMTP-Verbindung
    const transporter = nodemailer.createTransport({
      host: 'smtp.mail.us-east-1.awsapps.com',
      port: 465,
      secure: true, // SSL
      auth: {
        user: workmailCredentials.email,
        pass: workmailCredentials.password,
      },
      debug: true,
      logger: true,
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
    });

    // E-Mail Optionen
    const mailOptions = {
      from: from || workmailCredentials.email,
      to,
      subject,
      text: textContent || '',
      html: htmlContent || textContent || '',
    };

    console.log('Sending email with WorkMail credentials:', {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject,
      user: workmailCredentials.email,
    });

    // E-Mail senden
    const info = await transporter.sendMail(mailOptions);

    console.log('Email sent successfully:', info);

    return NextResponse.json({
      success: true,
      messageId: info.messageId,
      response: info.response,
      sender: workmailCredentials.email,
    });
  } catch (error) {
    console.error('WorkMail send error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unbekannter Fehler beim E-Mail-Versand',
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
