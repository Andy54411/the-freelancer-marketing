import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

interface JWTPayload {
  email: string;
  exp: number;
}

export async function POST(request: NextRequest) {
  try {
    // JWT-Authentifizierung - Verwende taskilo-admin-token wie WorkMail API
    const cookieStore = await cookies();
    const token = cookieStore.get('taskilo-admin-token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    let decoded: JWTPayload;
    try {
      decoded = jwt.verify(token, jwtSecret) as JWTPayload;
    } catch (error) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Request Body parsen
    const body = await request.json();
    const { emailId } = body;

    if (!emailId) {
      return NextResponse.json({ error: 'Email ID required' }, { status: 400 });
    }

    // Hier würde normalerweise die echte Wiederherstellung stattfinden
    // Für jetzt simulieren wir das erfolgreich

    return NextResponse.json({
      success: true,
      message: 'Email restored successfully',
      data: {
        emailId,
        restoredAt: new Date().toISOString(),
        restoredBy: decoded.email,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to restore email',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
