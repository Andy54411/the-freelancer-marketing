// Admin Users API
import { NextRequest, NextResponse } from 'next/server';
import { DynamoDBClient, ScanCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';

const dynamodb = new DynamoDBClient({
  region: process.env.AWS_REGION || 'eu-central-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function GET(_request: NextRequest) {
  try {
    const command = new ScanCommand({
      TableName: 'taskilo-admin-data',
    });

    const result = await dynamodb.send(command);
    const items = result.Items?.map(item => unmarshall(item)) || [];

    // Filtere und formatiere Benutzer
    const users = items
      .filter(item => ['user', 'company', 'admin'].includes(item.type))
      .map(user => ({
        id: user.id,
        email: user.email,
        name: user.name || user.email,
        type: user.type,
        role: user.role,
        phone: user.phone,
        company: user.companyName,
        status: user.status || 'active',
        createdAt: user.createdAt || new Date().toISOString(),
        lastLogin: user.lastLogin,
      }));

    return NextResponse.json({
      users: users.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    });
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json({ error: 'Fehler beim Laden der Benutzer' }, { status: 500 });
  }
}
