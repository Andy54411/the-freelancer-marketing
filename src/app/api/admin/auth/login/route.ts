// AWS Admin Login API
import { NextRequest, NextResponse } from 'next/server';
import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { SignJWT } from 'jose';
import { cookies } from 'next/headers';

const dynamodb = new DynamoDBClient({
  region: process.env.AWS_REGION || 'eu-central-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// JWT Secret für Admin-Tokens
const JWT_SECRET =
  process.env.JWT_SECRET || process.env.ADMIN_JWT_SECRET || 'taskilo-admin-secret-key-2024';
const JWT_SECRET_BYTES = new TextEncoder().encode(JWT_SECRET);

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'E-Mail und Passwort sind erforderlich' }, { status: 400 });
    }

    // Benutzer aus DynamoDB abrufen
    const command = new GetItemCommand({
      TableName: 'taskilo-admin-data',
      Key: marshall({ id: email }),
    });

    const result = await dynamodb.send(command);

    if (!result.Item) {
      return NextResponse.json({ error: 'Ungültige Anmeldedaten' }, { status: 401 });
    }

    const user = unmarshall(result.Item);

    // Passwort prüfen (in einer echten Anwendung sollte dies gehashed sein)
    // Für jetzt verwenden wir ein Standard-Admin-Passwort
    const validPasswords = ['admin123', 'taskilo2024', user.password || 'admin123'];

    if (!validPasswords.includes(password)) {
      return NextResponse.json({ error: 'Ungültige Anmeldedaten' }, { status: 401 });
    }

    // WorkMail Integration - Map Admin to WorkMail User
    const workmailEmailMapping = {
      'andy.staudinger@taskilo.de': 'andy.staudinger@taskilo.de',
      'admin@taskilo.de': 'support@taskilo.de',
      'support@taskilo.de': 'support@taskilo.de',
    };

    const adminEmail = user.email || user.id;
    const workmailEmail = workmailEmailMapping[adminEmail] || 'support@taskilo.de';

    // JWT Token erstellen
    const token = await new SignJWT({
      email: user.email || user.id,
      name: user.name || 'Admin',
      role: user.role || 'admin',
      workmailEmail: workmailEmail,
      workmailIntegration: true,
      iat: Math.floor(Date.now() / 1000),
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('24h')
      .sign(JWT_SECRET_BYTES);

    // Cookie setzen
    const cookieStore = await cookies();
    cookieStore.set('taskilo-admin-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60, // 24 Stunden
      path: '/',
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email || user.id,
        name: user.name || 'Admin',
        role: user.role || 'admin',
      },
      workmail: {
        email: workmailEmail,
        organization: 'taskilo-org',
        webInterface: 'https://taskilo-org.awsapps.com/mail',
        ssoEnabled: true,
      },
      message: `Admin-Login erfolgreich. WorkMail SSO aktiviert für ${workmailEmail}`,
    });
  } catch (error) {
    console.error('Admin login error:', error);
    return NextResponse.json({ error: 'Anmeldung fehlgeschlagen' }, { status: 500 });
  }
}
