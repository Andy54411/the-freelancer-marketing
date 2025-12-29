/**
 * Admin Login API
 * 
 * Firebase-basierte Admin-Authentifizierung
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { AdminAuthService } from '@/services/admin/AdminAuthService';
import { z } from 'zod';

// Request Schema
const LoginRequestSchema = z.object({
  email: z.string().email('Gueltige E-Mail-Adresse erforderlich'),
  password: z.string().min(1, 'Passwort ist erforderlich'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validierung
    const validation = LoginRequestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }
    
    const { email, password } = validation.data;
    
    // Initialen Master-Admin erstellen falls keine Admins existieren
    await AdminAuthService.initializeMasterAdmin();
    
    // Login versuchen
    const result = await AdminAuthService.login(email, password);
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 401 }
      );
    }
    
    // Cookie setzen - muss mit Middleware übereinstimmen!
    const cookieStore = await cookies();
    cookieStore.set('taskilo_admin_session', result.token!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60, // 24 Stunden
      path: '/',
    });
    
    return NextResponse.json({
      success: true,
      user: result.user,
      message: 'Erfolgreich angemeldet',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return NextResponse.json(
      { error: `Login fehlgeschlagen: ${errorMessage}` },
      { status: 500 }
    );
  }
}
