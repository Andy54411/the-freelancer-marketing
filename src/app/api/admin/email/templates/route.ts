// Email Templates API
import { NextRequest, NextResponse } from 'next/server';
import { DynamoDBClient, ScanCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';
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

async function verifyAdminAuth(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('taskilo-admin-token')?.value;
    if (!token) return false;
    await jwtVerify(token, JWT_SECRET);
    return true;
  } catch {
    return false;
  }
}

export async function GET(_request: NextRequest) {
  if (!(await verifyAdminAuth())) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  try {
    const command = new ScanCommand({
      TableName: 'taskilo-admin-data',
      FilterExpression: '#type = :type',
      ExpressionAttributeNames: {
        '#type': 'type',
      },
      ExpressionAttributeValues: marshall({
        ':type': 'email_template',
      }),
    });

    const result = await dynamodb.send(command);
    const templates = result.Items?.map(item => unmarshall(item)) || [];

    return NextResponse.json({
      templates: templates.map(template => ({
        id: template.id,
        name: template.name,
        subject: template.subject,
        htmlContent: template.htmlContent,
        textContent: template.textContent,
        category: template.category,
        createdAt: template.createdAt,
      })),
    });
  } catch (error) {
    console.error('Get templates error:', error);
    return NextResponse.json({ error: 'Fehler beim Laden der Templates' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!(await verifyAdminAuth())) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  try {
    const { name, subject, htmlContent, textContent, category } = await request.json();

    if (!name || !subject) {
      return NextResponse.json({ error: 'Name und Subject sind erforderlich' }, { status: 400 });
    }

    const templateId = `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const command = new PutItemCommand({
      TableName: 'taskilo-admin-data',
      Item: marshall({
        id: templateId,
        type: 'email_template',
        name,
        subject,
        htmlContent: htmlContent || '',
        textContent: textContent || '',
        category: category || 'notification',
        createdAt: new Date().toISOString(),
      }),
    });

    await dynamodb.send(command);

    return NextResponse.json({
      success: true,
      templateId,
    });
  } catch (error) {
    console.error('Create template error:', error);
    return NextResponse.json({ error: 'Fehler beim Erstellen des Templates' }, { status: 500 });
  }
}
