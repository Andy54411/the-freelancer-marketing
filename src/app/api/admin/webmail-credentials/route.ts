/**
 * Admin Webmail Credentials API
 * 
 * Speichert und ruft Webmail-Credentials fuer Admin-Benutzer ab
 */

import { NextRequest, NextResponse } from 'next/server';
import { AdminAuthService } from '@/services/admin/AdminAuthService';
import { z } from 'zod';

const SaveCredentialsSchema = z.object({
  webmailEmail: z.string().email(),
  webmailPassword: z.string().min(1),
});

/**
 * GET - Webmail-Credentials abrufen
 */
export async function GET() {
  try {
    const admin = await AdminAuthService.verifyFromRequest({} as NextRequest);
    
    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Nicht autorisiert' },
        { status: 401 }
      );
    }

    const result = await AdminAuthService.getWebmailCredentials(admin.id);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      credentials: result.credentials,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * POST - Webmail-Credentials speichern
 */
export async function POST(request: NextRequest) {
  try {
    const admin = await AdminAuthService.verifyFromRequest(request);
    
    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Nicht autorisiert' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validation = SaveCredentialsSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Ungueltige Eingabedaten', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { webmailEmail, webmailPassword } = validation.data;

    // Erst testen ob die Credentials funktionieren
    const testResponse = await fetch(`${process.env.WEBMAIL_PROXY_URL}/api/mailboxes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.WEBMAIL_API_KEY || '',
      },
      body: JSON.stringify({
        email: webmailEmail,
        password: webmailPassword,
      }),
    });

    const testResult = await testResponse.json();

    if (!testResult.success) {
      return NextResponse.json(
        { success: false, error: 'Webmail-Verbindung fehlgeschlagen. Bitte Zugangsdaten pruefen.' },
        { status: 400 }
      );
    }

    // Credentials speichern
    const saveResult = await AdminAuthService.saveWebmailCredentials(
      admin.id,
      webmailEmail,
      webmailPassword
    );

    if (!saveResult.success) {
      return NextResponse.json(
        { success: false, error: saveResult.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Webmail-Credentials gespeichert',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Webmail-Credentials loeschen
 */
export async function DELETE() {
  try {
    const admin = await AdminAuthService.verifyFromRequest({} as NextRequest);
    
    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Nicht autorisiert' },
        { status: 401 }
      );
    }

    const result = await AdminAuthService.deleteWebmailCredentials(admin.id);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Webmail-Credentials geloescht',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
