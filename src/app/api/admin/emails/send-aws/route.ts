import { NextRequest, NextResponse } from 'next/server';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

// AWS SES Client konfigurieren
const sesClient = new SESClient({
  region: 'eu-central-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function POST(request: NextRequest) {
  try {
    console.log('=== AWS SES API Called ===');
    console.log('Request method:', request.method);
    console.log('Request URL:', request.url);

    // AWS Credentials prüfen
    const hasAccessKey = !!process.env.AWS_ACCESS_KEY_ID;
    const hasSecretKey = !!process.env.AWS_SECRET_ACCESS_KEY;
    const hasRegion = !!process.env.AWS_REGION;

    console.log('AWS Environment Check:', {
      hasAccessKey,
      hasSecretKey,
      hasRegion,
      accessKeyPrefix: process.env.AWS_ACCESS_KEY_ID?.substring(0, 4) + '***',
      region: process.env.AWS_REGION || 'eu-central-1',
    });

    if (!hasAccessKey || !hasSecretKey) {
      console.error('AWS Credentials fehlen:', {
        hasAccessKey,
        hasSecretKey,
      });
      return NextResponse.json(
        {
          error: 'AWS SES Konfiguration unvollständig',
          details: 'AWS_ACCESS_KEY_ID oder AWS_SECRET_ACCESS_KEY fehlen',
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    console.log('E-Mail Request Body:', JSON.stringify(body, null, 2));

    const { to, cc, bcc, subject, htmlContent, textContent, from = 'info@taskilo.de' } = body;

    // Validiere Sender-E-Mail-Adresse (nur verifizierte taskilo.de Adressen erlaubt)
    const allowedSenderEmails = [
      'andy.staudinger@taskilo.de',
      'info@taskilo.de',
      'noreply@taskilo.de',
      'admin@taskilo.de',
      'marketing@taskilo.de',
      'support@taskilo.de',
      'hello@taskilo.de',
    ];

    // ULTIMATIVE SICHERHEIT: Überschreibe ungültige From-Adressen IMMER
    let validatedFrom = from;
    if (!allowedSenderEmails.includes(from)) {
      console.warn(`⚠️ UNGÜLTIGE SENDER-EMAIL ÜBERSCHRIEBEN: "${from}" → "info@taskilo.de"`);
      validatedFrom = 'info@taskilo.de'; // Überschreibe mit Standard

      // Log für Debug-Zwecke
      console.log('Ursprüngliche From-Email:', from);
      console.log('Überschriebene From-Email:', validatedFrom);
      console.log('Erlaubte Sender-Emails:', allowedSenderEmails);
    }

    console.log('✅ Validierte Sender-E-Mail:', validatedFrom);

    // Normalisiere 'to' zu einem Array
    const recipients = Array.isArray(to) ? to : to ? [to] : [];

    // Validierung
    if (!recipients || recipients.length === 0) {
      return NextResponse.json({ error: 'Mindestens ein Empfänger erforderlich' }, { status: 400 });
    }

    if (!subject || !htmlContent) {
      return NextResponse.json({ error: 'Betreff und Inhalt sind erforderlich' }, { status: 400 });
    }

    // AWS SES E-Mail Parameter vorbereiten
    const emailParams = {
      Source: validatedFrom, // Verwende validierte E-Mail-Adresse
      Destination: {
        ToAddresses: recipients,
        CcAddresses: cc || [],
        BccAddresses: bcc || [],
      },
      Message: {
        Subject: {
          Data: subject,
          Charset: 'UTF-8',
        },
        Body: {
          Html: {
            Data: htmlContent,
            Charset: 'UTF-8',
          },
          Text: textContent
            ? {
                Data: textContent,
                Charset: 'UTF-8',
              }
            : undefined,
        },
      },
      Tags: [
        {
          Name: 'Source',
          Value: 'Taskilo-Admin-Panel',
        },
        {
          Name: 'EmailType',
          Value: 'SingleEmail',
        },
      ],
    };

    console.log('AWS SES E-Mail Parameter:', JSON.stringify(emailParams, null, 2));

    // E-Mail über AWS SES senden
    const command = new SendEmailCommand(emailParams);
    console.log('Sende E-Mail über AWS SES...');
    const result = await sesClient.send(command);
    console.log('AWS SES Antwort:', result);

    return NextResponse.json({
      success: true,
      messageId: result.MessageId,
      message: 'E-Mail erfolgreich über AWS SES gesendet',
      provider: 'AWS SES',
    });
  } catch (error) {
    console.error('=== AWS SES E-Mail Fehler ===');
    console.error('Error type:', typeof error);
    console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('Full error object:', error);

    // Detaillierte Fehlerbehandlung
    if (error instanceof Error) {
      if (error.message.includes('MessageRejected')) {
        return NextResponse.json(
          { error: 'E-Mail wurde von AWS SES abgelehnt. Prüfen Sie die E-Mail-Adressen.' },
          { status: 400 }
        );
      }
      if (error.message.includes('SendingQuotaExceeded')) {
        return NextResponse.json(
          { error: 'AWS SES Versandlimit erreicht. Kontaktieren Sie den Administrator.' },
          { status: 429 }
        );
      }
    }

    return NextResponse.json(
      {
        error: 'AWS SES Fehler beim E-Mail-Versand',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}

// E-Mail-Status abrufen
export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({
      success: true,
      provider: 'AWS SES',
      region: 'eu-central-1',
      status: 'ready',
      message: 'AWS SES E-Mail-Service ist bereit',
    });
  } catch (error) {
    console.error('AWS SES Status Fehler:', error);
    return NextResponse.json({ error: 'AWS SES Service nicht verfügbar' }, { status: 500 });
  }
}
