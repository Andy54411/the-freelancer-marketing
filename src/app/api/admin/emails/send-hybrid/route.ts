import { NextRequest, NextResponse } from 'next/server';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { emailService } from '@/lib/resend-email-service';

// AWS SES Client konfigurieren (nur wenn Credentials verfügbar)
let sesClient: SESClient | null = null;

if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
  sesClient = new SESClient({
    region: 'eu-central-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });
}

async function sendWithAWSSES(emailData: any) {
  if (!sesClient) {
    throw new Error('AWS SES nicht konfiguriert');
  }

  const emailParams = {
    Source: emailData.from,
    Destination: {
      ToAddresses: emailData.to,
      CcAddresses: emailData.cc || [],
      BccAddresses: emailData.bcc || [],
    },
    Message: {
      Subject: {
        Data: emailData.subject,
        Charset: 'UTF-8',
      },
      Body: {
        Html: {
          Data: emailData.htmlContent,
          Charset: 'UTF-8',
        },
        Text: emailData.textContent
          ? {
              Data: emailData.textContent,
              Charset: 'UTF-8',
            }
          : undefined,
      },
    },
    Tags: [
      {
        Name: 'Source',
        Value: 'Taskilo-Hybrid-Email',
      },
      {
        Name: 'EmailType',
        Value: 'SingleEmail',
      },
    ],
  };

  const command = new SendEmailCommand(emailParams);
  const result = await sesClient.send(command);

  return {
    success: true,
    messageId: result.MessageId,
    provider: 'AWS SES',
  };
}

async function sendWithResend(emailData: any) {
  const result = await emailService.sendEmail({
    to: emailData.to,
    cc: emailData.cc,
    bcc: emailData.bcc,
    from: emailData.from,
    subject: emailData.subject,
    htmlContent: emailData.htmlContent,
    textContent: emailData.textContent,
  });

  if (result.success) {
    return {
      success: true,
      messageId: result.messageId,
      provider: 'Resend',
    };
  } else {
    throw new Error(result.error || 'Resend Fehler');
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, cc, bcc, subject, htmlContent, textContent, from = 'info@taskilo.de' } = body;

    // Validierung
    if (!to || !Array.isArray(to) || to.length === 0) {
      return NextResponse.json({ error: 'Mindestens ein Empfänger erforderlich' }, { status: 400 });
    }

    if (!subject || !htmlContent) {
      return NextResponse.json({ error: 'Betreff und Inhalt sind erforderlich' }, { status: 400 });
    }

    const emailData = { to, cc, bcc, subject, htmlContent, textContent, from };

    let result;
    let usedProvider = '';

    // Zuerst AWS SES versuchen
    if (sesClient) {
      try {
        console.log('Versuche E-Mail-Versand über AWS SES...');
        result = await sendWithAWSSES(emailData);
        usedProvider = 'AWS SES';
      } catch (sesError) {
        console.warn('AWS SES Fehler, verwende Resend als Fallback:', sesError);

        // Fallback zu Resend
        try {
          result = await sendWithResend(emailData);
          usedProvider = 'Resend (Fallback)';
        } catch (resendError) {
          console.error('Beide E-Mail-Services fehlgeschlagen:', { sesError, resendError });
          throw new Error('Sowohl AWS SES als auch Resend fehlgeschlagen');
        }
      }
    } else {
      // Nur Resend verwenden
      console.log('AWS SES nicht konfiguriert, verwende Resend...');
      result = await sendWithResend(emailData);
      usedProvider = 'Resend (Primary)';
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      message: `E-Mail erfolgreich über ${usedProvider} gesendet`,
      provider: usedProvider,
    });
  } catch (error) {
    console.error('Hybrid E-Mail API Fehler:', error);

    // Detaillierte Fehlerbehandlung
    if (error instanceof Error) {
      if (error.message.includes('MessageRejected')) {
        return NextResponse.json(
          { error: 'E-Mail wurde abgelehnt. Prüfen Sie die E-Mail-Adressen.' },
          { status: 400 }
        );
      }
      if (error.message.includes('SendingQuotaExceeded')) {
        return NextResponse.json(
          { error: 'E-Mail-Versandlimit erreicht. Kontaktieren Sie den Administrator.' },
          { status: 429 }
        );
      }
    }

    return NextResponse.json(
      {
        error: 'E-Mail-Versand fehlgeschlagen',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}

// Status-Endpoint
export async function GET() {
  const awsConfigured = !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
  const resendConfigured = !!process.env.RESEND_API_KEY;

  return NextResponse.json({
    success: true,
    providers: {
      aws_ses: {
        configured: awsConfigured,
        status: awsConfigured ? 'ready' : 'not_configured',
      },
      resend: {
        configured: resendConfigured,
        status: resendConfigured ? 'ready' : 'not_configured',
      },
    },
    primary: awsConfigured ? 'AWS SES' : 'Resend',
    fallback: awsConfigured && resendConfigured ? 'Resend' : 'none',
  });
}
