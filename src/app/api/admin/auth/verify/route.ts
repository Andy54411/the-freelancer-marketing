/**
 * Admin Auth Verification API
 * 
 * Firebase-basierte Admin-Authentifizierung
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { AdminAuthService } from '@/services/admin/AdminAuthService';

export async function GET(_request: NextRequest) {
  try {
    // JWT Token aus Cookie lesen
    const cookieStore = await cookies();
    const token = cookieStore.get('taskilo_admin_session')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    // Token verifizieren
    const result = await AdminAuthService.verifyToken(token);

    if (!result.valid) {
      return NextResponse.json({ error: result.error }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: result.payload!.sub,
        email: result.payload!.email,
        name: result.payload!.name,
        role: result.payload!.role,
        permissions: result.payload!.permissions,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return NextResponse.json(
      { error: `Authentifizierungsfehler: ${errorMessage}` },
      { status: 500 }
    );
  }
}
