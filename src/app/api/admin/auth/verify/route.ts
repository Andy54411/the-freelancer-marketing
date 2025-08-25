// AWS Admin Authentication Verification
import { NextRequest, NextResponse } from 'next/server';
import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
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
const JWT_SECRET =
  process.env.JWT_SECRET || process.env.ADMIN_JWT_SECRET || 'taskilo-admin-secret-key-2024';
const JWT_SECRET_BYTES = new TextEncoder().encode(JWT_SECRET);

export async function GET(request: NextRequest) {
  try {
    // JWT Token aus Cookie lesen
    const cookieStore = await cookies();
    const token = cookieStore.get('taskilo-admin-token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    // JWT Token verifizieren
    let payload;
    try {
      const { payload: jwtPayload } = await jwtVerify(token, JWT_SECRET_BYTES);
      payload = jwtPayload;
    } catch (error) {
      return NextResponse.json({ error: 'Ungültiger Token' }, { status: 401 });
    }

    // Benutzer aus DynamoDB validieren
    const command = new GetItemCommand({
      TableName: 'taskilo-admin-data',
      Key: marshall({ id: payload.email }),
    });

    const result = await dynamodb.send(command);

    if (!result.Item) {
      return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 401 });
    }

    const user = unmarshall(result.Item);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email || user.id,
        name: user.name || 'Admin',
        role: user.role || 'admin',
      },
    });
  } catch (error) {

    return NextResponse.json({ error: 'Authentifizierungsfehler' }, { status: 500 });
  }
}
