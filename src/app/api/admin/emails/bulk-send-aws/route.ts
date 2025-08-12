import { NextRequest, NextResponse } from 'next/server';
import { SESClient, SendBulkTemplatedEmailCommand, SendEmailCommand } from '@aws-sdk/client-ses';

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
    const body = await request.json();
    const { messages } = body;

    // Validierung
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Mindestens eine E-Mail erforderlich' }, { status: 400 });
    }

    const results = [];
    let successCount = 0;
    let failureCount = 0;

    // Jede E-Mail einzeln senden (AWS SES Bulk ist für Templates)
    for (const message of messages) {
      try {
        const emailParams = {
          Source: message.from,
          Destination: {
            ToAddresses: message.to,
            CcAddresses: message.cc || [],
            BccAddresses: message.bcc || [],
          },
          Message: {
            Subject: {
              Data: message.subject,
              Charset: 'UTF-8',
            },
            Body: {
              Html: {
                Data: message.htmlContent,
                Charset: 'UTF-8',
              },
              Text: message.textContent
                ? {
                    Data: message.textContent,
                    Charset: 'UTF-8',
                  }
                : undefined,
            },
          },
          Tags: [
            {
              Name: 'Source',
              Value: 'Taskilo-Bulk-Email',
            },
            {
              Name: 'EmailType',
              Value: 'BulkEmail',
            },
          ],
        };

        const command = new SendEmailCommand(emailParams);
        const result = await sesClient.send(command);

        results.push({
          to: message.to,
          messageId: result.MessageId,
          success: true,
        });
        successCount++;
      } catch (error) {
        console.error(`Fehler beim Senden an ${message.to}:`, error);
        results.push({
          to: message.to,
          error: error instanceof Error ? error.message : 'Unbekannter Fehler',
          success: false,
        });
        failureCount++;
      }

      // Kleine Pause zwischen E-Mails um Rate-Limiting zu vermeiden
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return NextResponse.json({
      success: successCount > 0,
      totalSent: messages.length,
      successCount,
      failureCount,
      results,
      message: `${successCount} von ${messages.length} E-Mails erfolgreich über AWS SES gesendet`,
      provider: 'AWS SES',
    });
  } catch (error) {
    console.error('AWS SES Bulk-E-Mail Fehler:', error);
    return NextResponse.json(
      {
        error: 'AWS SES Fehler beim Bulk-E-Mail-Versand',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}
