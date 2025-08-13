// AWS SES Email Send API
import { NextRequest, NextResponse } from 'next/server';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const sesClient = new SESClient({
  region: process.env.AWS_REGION || 'eu-central-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const dynamodb = new DynamoDBClient({
  region: process.env.AWS_REGION || 'eu-central-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// JWT Secret für Admin-Tokens
const JWT_SECRET = new TextEncoder().encode(
  process.env.ADMIN_JWT_SECRET || 'taskilo-admin-secret-key-2024'
);

export async function POST(request: NextRequest) {
  try {
    // Admin-Authentifizierung prüfen
    const cookieStore = await cookies();
    const token = cookieStore.get('taskilo-admin-token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    try {
      await jwtVerify(token, JWT_SECRET);
    } catch (error) {
      return NextResponse.json({ error: 'Ungültiger Token' }, { status: 401 });
    }
    const { to, subject, htmlContent, textContent } = await request.json();

    if (!to || !subject) {
      return NextResponse.json({ error: 'To und Subject sind erforderlich' }, { status: 400 });
    }

    // Verifizierte E-Mail-Adressen für AWS SES Sandbox
    const verifiedEmails = ['andy.staudinger@taskilo.de', 'test@taskilo.de', 'admin@taskilo.de'];

    if (!verifiedEmails.includes(to)) {
      return NextResponse.json(
        {
          error: 'E-Mail-Adresse nicht verifiziert',
          message: `Die E-Mail-Adresse "${to}" ist nicht in AWS SES verifiziert. Verfügbare Adressen: ${verifiedEmails.join(', ')}`,
          verifiedEmails: verifiedEmails,
        },
        { status: 400 }
      );
    }

    // E-Mail über AWS SES senden
    const sendCommand = new SendEmailCommand({
      Source: 'andy.staudinger@taskilo.de',
      Destination: {
        ToAddresses: [to],
      },
      Message: {
        Subject: {
          Data: subject,
          Charset: 'UTF-8',
        },
        Body: {
          Html: htmlContent
            ? {
                Data: htmlContent,
                Charset: 'UTF-8',
              }
            : undefined,
          Text: textContent
            ? {
                Data: textContent,
                Charset: 'UTF-8',
              }
            : {
                Data: subject,
                Charset: 'UTF-8',
              },
        },
      },
    });

    const result = await sesClient.send(sendCommand);

    // E-Mail-Log in DynamoDB speichern
    const emailId = `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const logCommand = new PutItemCommand({
      TableName: 'taskilo-admin-data',
      Item: marshall({
        id: emailId,
        type: 'email',
        to,
        subject,
        htmlContent: htmlContent || '',
        textContent: textContent || '',
        status: 'sent',
        sentAt: new Date().toISOString(),
        sesMessageId: result.MessageId,
        createdAt: new Date().toISOString(),
      }),
    });

    await dynamodb.send(logCommand);

    return NextResponse.json({
      success: true,
      messageId: result.MessageId,
      emailId,
    });
  } catch (error) {
    console.error('Email send error:', error);
    return NextResponse.json(
      { error: 'Fehler beim Senden der E-Mail', details: error.message },
      { status: 500 }
    );
  }
}
