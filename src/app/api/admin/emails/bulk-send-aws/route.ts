import { NextRequest, NextResponse } from 'next/server';
import { SESClient, SendBulkTemplatedEmailCommand, SendEmailCommand } from '@aws-sdk/client-ses';
import { cookies } from 'next/headers';

// AWS SES Client konfigurieren
const sesClient = new SESClient({
  region: 'eu-central-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// Helper function to get authenticated user from AWS session
async function getAuthenticatedUserEmail(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('taskilo_admin_aws_session');

    if (!sessionCookie) {
      console.log('🔍 No AWS session cookie found, checking mock session...');

      // Fallback to mock authentication
      const mockSessionCookie = cookieStore.get('taskilo_admin_session');
      if (mockSessionCookie) {
        console.log('✅ Mock session found, using default sender email');
        return 'andy.staudinger@taskilo.de'; // Default for mock sessions
      }

      return null;
    }

    const sessionData = JSON.parse(sessionCookie.value);

    // Check if session is expired
    if (Date.now() > sessionData.expiresAt) {
      console.log('❌ AWS Session expired');
      return null;
    }

    console.log(`✅ Found authenticated user email: ${sessionData.email}`);
    return sessionData.email;
  } catch (error) {
    console.error('❌ Error getting authenticated user:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    // 🔐 GET AUTHENTICATED USER EMAIL FROM SESSION
    const authenticatedUserEmail = await getAuthenticatedUserEmail();

    if (!authenticatedUserEmail) {
      console.error('❌ No authenticated user found for bulk email');
      return NextResponse.json(
        {
          error: 'Authentication required',
          details: 'No valid AWS session found. Please log in again.',
        },
        { status: 401 }
      );
    }

    console.log(
      `🔐 Using authenticated user email as sender for bulk emails: ${authenticatedUserEmail}`
    );

    // 🔐 Validiere, dass die authentifizierte Email in AWS SES verifiziert ist
    const allowedSenderEmails = [
      'andy.staudinger@taskilo.de',
      'info@taskilo.de',
      'noreply@taskilo.de',
      'admin@taskilo.de',
      'marketing@taskilo.de',
      'support@taskilo.de',
      'hello@taskilo.de',
    ];

    if (!allowedSenderEmails.includes(authenticatedUserEmail)) {
      console.error(
        `❌ Bulk Email: Email-Adresse nicht verifiziert in AWS SES: ${authenticatedUserEmail}`
      );

      return NextResponse.json(
        {
          error: 'E-Mail-Adresse nicht verifiziert in AWS SES',
          details: `Die E-Mail-Adresse "${authenticatedUserEmail}" ist nicht in AWS SES verifiziert.`,
          authenticatedEmail: authenticatedUserEmail,
          allowedEmails: allowedSenderEmails,
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { messages } = body;

    // Validierung
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Mindestens eine E-Mail erforderlich' }, { status: 400 });
    }

    const results = [];
    let successCount = 0;
    let failureCount = 0;

    console.log(
      `📧 Sending ${messages.length} bulk emails with authenticated sender: ${authenticatedUserEmail}`
    );

    // Jede E-Mail einzeln senden (AWS SES Bulk ist für Templates)
    for (const message of messages) {
      try {
        // 🛡️ SECURITY: Always use authenticated user's email as sender (ignore any 'from' in message)
        const emailParams = {
          Source: authenticatedUserEmail, // ✅ Use authenticated email from session
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
