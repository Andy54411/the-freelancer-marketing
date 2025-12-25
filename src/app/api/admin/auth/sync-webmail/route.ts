/**
 * Admin Auth Sync from Webmail API
 * 
 * Synchronisiert Admin-Passwort mit Webmail-Credentials
 * Wird aufgerufen wenn Webmail-Login erfolgreich war
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { AdminAuthService } from '@/services/admin/AdminAuthService';
import { z } from 'zod';

const SyncRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const validation = SyncRequestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Ungueltige Anfrage' },
        { status: 400 }
      );
    }

    const { email, password } = validation.data;

    // Initialen Master-Admin erstellen falls keine Admins existieren
    await AdminAuthService.initializeMasterAdmin();

    // Passwort synchronisieren und Token erhalten
    const result = await AdminAuthService.syncPasswordFromWebmail(email, password);

    if (!result.success) {
      // Kein Admin-Benutzer - das ist OK, einfach nichts tun
      return NextResponse.json({ success: false, isAdmin: false });
    }

    // Cookie setzen
    const cookieStore = await cookies();
    cookieStore.set('taskilo-admin-token', result.token!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60, // 24 Stunden
      path: '/',
    });

    return NextResponse.json({
      success: true,
      isAdmin: true,
      user: result.user,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
