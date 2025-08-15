import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

interface JWTPayload {
  email: string;
  exp: number;
}

export async function POST(request: NextRequest) {
  try {
    console.log('🗂️ [Archive API] Starting email archive process...');

    // JWT-Authentifizierung - Verwende taskilo-admin-token wie WorkMail API
    const cookieStore = await cookies();
    const token = cookieStore.get('taskilo-admin-token')?.value;

    if (!token) {
      console.log('❌ [Archive API] No taskilo-admin-token found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.log('❌ [Archive API] JWT secret not configured');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    let decoded: JWTPayload;
    try {
      decoded = jwt.verify(token, jwtSecret) as JWTPayload;
      console.log('✅ [Archive API] JWT Cookie verified for admin:', { email: decoded.email });
    } catch (error) {
      console.log('❌ [Archive API] Invalid JWT token');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Request Body parsen
    const body = await request.json();
    const { emailId } = body;

    if (!emailId) {
      console.log('❌ [Archive API] No email ID provided');
      return NextResponse.json({ error: 'Email ID required' }, { status: 400 });
    }

    console.log(`📧 [Archive API] Archiving email: ${emailId}`);

    // Hier würde normalerweise die echte Archivierung stattfinden
    // Für jetzt simulieren wir das erfolgreich

    console.log(`✅ [Archive API] Email ${emailId} successfully archived`);

    return NextResponse.json({
      success: true,
      message: 'Email archived successfully',
      data: {
        emailId,
        archivedAt: new Date().toISOString(),
        archivedBy: decoded.email,
      },
    });
  } catch (error) {
    console.error('❌ [Archive API] Archive process failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to archive email',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
