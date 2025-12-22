/**
 * Admin-Benutzer Verwaltung API Route
 * 
 * Firebase-basierte Admin-Benutzerverwaltung
 */

import { NextRequest, NextResponse } from 'next/server';
import { AdminAuthService } from '@/services/admin/AdminAuthService';
import { cookies } from 'next/headers';

// Admin-Authentifizierung pruefen
async function verifyAdminAuth(): Promise<{ valid: boolean; error?: string; payload?: { sub: string; role: string } }> {
  if (process.env.NODE_ENV === 'development' && process.env.BYPASS_ADMIN_AUTH === 'true') {
    return { valid: true, payload: { sub: 'dev-admin', role: 'master-admin' } };
  }

  const cookieStore = await cookies();
  const token = cookieStore.get('taskilo-admin-token')?.value;

  if (!token) {
    return { valid: false, error: 'Nicht autorisiert' };
  }

  return AdminAuthService.verifyToken(token);
}

// GET - Alle Admin-Benutzer abrufen
export async function GET(_request: NextRequest) {
  try {
    const adminUsers = await AdminAuthService.getAllAdminUsers();

    return NextResponse.json({
      success: true,
      adminUsers,
      count: adminUsers.length,
      message: 'Admin-Benutzer erfolgreich geladen',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return NextResponse.json(
      { error: 'Fehler beim Laden der Admin-Benutzer', details: errorMessage },
      { status: 500 }
    );
  }
}

// POST - Neuen Admin-Benutzer erstellen
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAdminAuth();
    if (!authResult.valid) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    // Nur Master-Admin kann neue Admins erstellen
    if (authResult.payload?.role !== 'master-admin') {
      return NextResponse.json(
        { error: 'Nur Master-Admins koennen neue Admin-Benutzer erstellen' },
        { status: 403 }
      );
    }

    const { email, name, password, role, departments, permissions, phone, notes } = await request.json();

    if (!email || !name || !password || !role) {
      return NextResponse.json(
        { error: 'E-Mail, Name, Passwort und Rolle sind erforderlich' },
        { status: 400 }
      );
    }

    const result = await AdminAuthService.createAdminUser({
      email,
      name,
      password,
      role,
      departments,
      permissions,
      phone,
      notes,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      userId: result.userId,
      message: 'Admin-Benutzer erfolgreich erstellt',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return NextResponse.json(
      { error: 'Fehler beim Erstellen des Admin-Benutzers', details: errorMessage },
      { status: 500 }
    );
  }
}

// PUT - Admin-Benutzer aktualisieren (Status togglen)
export async function PUT(request: NextRequest) {
  try {
    const authResult = await verifyAdminAuth();
    if (!authResult.valid) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const { userId, action } = await request.json();

    if (!userId || !action) {
      return NextResponse.json(
        { error: 'userId und action sind erforderlich' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'toggle-status':
        const result = await AdminAuthService.toggleUserStatus(userId);
        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }
        return NextResponse.json({
          success: true,
          isActive: result.isActive,
          message: result.isActive ? 'Benutzer aktiviert' : 'Benutzer deaktiviert',
        });

      default:
        return NextResponse.json({ error: 'Unbekannte Aktion' }, { status: 400 });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return NextResponse.json(
      { error: 'Fehler beim Aktualisieren', details: errorMessage },
      { status: 500 }
    );
  }
}
