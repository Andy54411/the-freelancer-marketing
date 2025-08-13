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

export async function POST(request: NextRequest) {
  try {
    const { email, name, password, setupKey } = await request.json();

    // Sicherheitsschlüssel prüfen
    if (setupKey !== 'taskilo-admin-setup-2024') {
      return NextResponse.json({ error: 'Ungültiger Setup-Schlüssel' }, { status: 401 });
    }

    if (!email || !name || !password) {
      return NextResponse.json(
        { error: 'E-Mail, Name und Passwort sind erforderlich' },
        { status: 400 }
      );
    }

    // Prüfen ob Admin bereits existiert
    const checkCommand = new GetItemCommand({
      TableName: 'taskilo-admin-data',
      Key: marshall({ id: email }),
    });

    const existingResult = await dynamodb.send(checkCommand);
    if (existingResult.Item) {
      return NextResponse.json({ error: 'Admin-Benutzer existiert bereits' }, { status: 409 });
    }

    // Admin-Benutzer erstellen
    const adminUser = {
      id: email,
      email: email,
      name: name,
      password: password, // In Produktion sollte dies gehashed werden
      type: 'admin',
      role: 'admin',
      status: 'active',
      createdAt: new Date().toISOString(),
      permissions: ['read', 'write', 'admin', 'system'],
    };

    const putCommand = new PutItemCommand({
      TableName: 'taskilo-admin-data',
      Item: marshall(adminUser),
    });

    await dynamodb.send(putCommand);

    return NextResponse.json({
      success: true,
      message: 'Admin-Benutzer erfolgreich erstellt',
      user: {
        id: adminUser.id,
        email: adminUser.email,
        name: adminUser.name,
        role: adminUser.role,
      },
    });
  } catch (error) {
    console.error('Admin setup error:', error);
    return NextResponse.json(
      { error: 'Fehler beim Erstellen des Admin-Benutzers' },
      { status: 500 }
    );
  }
}

export async function GET(_request: NextRequest) {
  return NextResponse.json({
    info: 'Admin Setup API',
    usage: 'POST mit { email, name, password, setupKey }',
    note: 'Nur für initiale Admin-Benutzer-Erstellung',
  });
}
