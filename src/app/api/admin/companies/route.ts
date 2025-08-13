// Admin Companies API
import { NextRequest, NextResponse } from 'next/server';
import { DynamoDBClient, ScanCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

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
      FilterExpression: '#type = :type',
      ExpressionAttributeNames: {
        '#type': 'type',
      },
      ExpressionAttributeValues: marshall({
        ':type': 'company',
      }),
    });

    const result = await dynamodb.send(command);
    const items = result.Items?.map(item => unmarshall(item)) || [];

    // Formatiere Unternehmensdaten
    const companies = items.map(company => ({
      id: company.id,
      email: company.email,
      name: company.name || company.email,
      type: company.type,
      companyName: company.companyName,
      industry: company.industry,
      website: company.website,
      phone: company.phone,
      status: company.status || 'active',
      createdAt: company.createdAt || new Date().toISOString(),
      lastLogin: company.lastLogin,
    }));

    return NextResponse.json({
      companies: companies.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    });
  } catch (error) {
    console.error('Get companies error:', error);
    return NextResponse.json({ error: 'Fehler beim Laden der Unternehmen' }, { status: 500 });
  }
}
