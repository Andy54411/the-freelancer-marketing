// AWS Admin Authentication Verification
import { NextRequest, NextResponse } from 'next/server';
import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

const dynamodb = new DynamoDBClient({
  region: process.env.AWS_REGION || 'eu-central-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function GET(request: NextRequest) {
  try {
    // In einer echten Implementierung würden Sie hier JWT oder Session-Token validieren
    // Für jetzt verwenden wir eine einfache Email-basierte Authentifizierung

    const email = request.headers.get('x-admin-email') || 'andy.staudinger@taskilo.de';

    // Prüfe ob der Benutzer in der DynamoDB Admin-Tabelle existiert
    const command = new GetItemCommand({
      TableName: 'taskilo-admin-data',
      Key: marshall({ id: email }),
    });

    const result = await dynamodb.send(command);

    if (!result.Item) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const user = unmarshall(result.Item);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name || 'Admin',
        role: user.role || 'admin',
      },
    });
  } catch (error) {
    console.error('Auth verification error:', error);
    return NextResponse.json({ error: 'Authentifizierungsfehler' }, { status: 500 });
  }
}
