// Admin Setup API - Erstelle Admin-Benutzer
import { NextRequest, NextResponse } from 'next/server';
import { DynamoDBClient, PutItemCommand, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

const dynamodb = new DynamoDBClient({
  region: process.env.AWS_REGION || 'eu-central-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function POST(_request: NextRequest) {
  // Setup-API ist nach Master-Admin-Erstellung deaktiviert
  return NextResponse.json(
    {
      error: 'Setup wurde bereits abgeschlossen',
      message: 'Master-Admin existiert bereits - Setup-API ist deaktiviert',
    },
    { status: 403 }
  );
}

export async function GET(_request: NextRequest) {
  return NextResponse.json({
    info: 'Admin Setup API',
    usage: 'POST mit { email, name, password, setupKey }',
    note: 'Nur für initiale Admin-Benutzer-Erstellung',
  });
}
