// AWS SES Email Send API
import { NextRequest, NextResponse } from 'next/server';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';

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

export async function POST(request: NextRequest) {
  try {
    const { to, subject, htmlContent, textContent } = await request.json();

    if (!to || !subject) {
      return NextResponse.json({ error: 'To und Subject sind erforderlich' }, { status: 400 });
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
