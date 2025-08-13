// Sent Emails API
import { NextRequest, NextResponse } from 'next/server';
import { DynamoDBClient, ScanCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

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

export async function GET(_request: NextRequest) {
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
    const command = new ScanCommand({
      TableName: 'taskilo-admin-data',
      FilterExpression: '#type = :type',
      ExpressionAttributeNames: {
        '#type': 'type',
      },
      ExpressionAttributeValues: marshall({
        ':type': 'email',
      }),
    });

    const result = await dynamodb.send(command);
    const emails = result.Items?.map(item => unmarshall(item)) || [];

    // Sortiere nach sentAt (neueste zuerst)
    emails.sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());

    return NextResponse.json({
      emails: emails.map(email => ({
        id: email.id,
        to: email.to,
        subject: email.subject,
        status: email.status || 'sent',
        sentAt: email.sentAt,
        sesMessageId: email.sesMessageId,
      })),
    });
  } catch (error) {
    console.error('Get sent emails error:', error);
    return NextResponse.json(
      { error: 'Fehler beim Laden der gesendeten E-Mails' },
      { status: 500 }
    );
  }
}
