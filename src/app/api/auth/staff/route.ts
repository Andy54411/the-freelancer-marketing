import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// In einer echten Anwendung würden diese Daten aus einer Datenbank kommen
const STAFF_CREDENTIALS = [
  {
    id: 'staff-1',
    email: 'andy.staudinger@taskilo.de',
    password: 'master123', // In Realität würde das gehasht sein
    name: 'Andy Staudinger',
    role: 'admin',
    department: 'Management',
    permissions: ['email_read', 'email_write', 'email_assign', 'staff_manage', 'system_admin'],
    status: 'active',
  },
  {
    id: 'staff-2',
    email: 'noreply@taskilo.de',
    password: 'admin123',
    name: 'Andy Staudinger',
    role: 'support',
    department: 'System Notifications',
    permissions: ['email_read', 'email_write', 'system_notifications'],
    status: 'active',
  },
  {
    id: 'staff-3',
    email: 'support@taskilo.de',
    password: 'support123',
    name: 'Andy Staudinger',
    role: 'support',
    department: 'Customer Support',
    permissions: ['email_read', 'email_write', 'escalate'],
    status: 'active',
  },
  {
    id: 'staff-4',
    email: 'newsletter@taskilo.de',
    password: 'newsletter123',
    name: 'Elisabeth Schröder',
    role: 'manager',
    department: 'Marketing & Newsletter',
    permissions: ['email_read', 'email_write', 'newsletter_manage'],
    status: 'active',
  },
];

// JWT-ähnliches Token (vereinfacht für Demo)
function createToken(staff: any) {
  const payload = {
    id: staff.id,
    email: staff.email,
    name: staff.name,
    role: staff.role,
    permissions: staff.permissions,
    exp: Date.now() + 24 * 60 * 60 * 1000, // 24 Stunden
  };

  return btoa(JSON.stringify(payload));
}

function verifyToken(token: string) {
  try {
    const payload = JSON.parse(atob(token));
    if (payload.exp < Date.now()) {
      return null; // Token abgelaufen
    }
    return payload;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, action } = body;

    if (action === 'login') {
      if (!email || !password) {
        return NextResponse.json(
          { error: 'E-Mail und Passwort sind erforderlich' },
          { status: 400 }
        );
      }

      // Benutzer suchen
      const staff = STAFF_CREDENTIALS.find(s => s.email === email && s.password === password);

      if (!staff || staff.status !== 'active') {
        // Log fehlgeschlagenen Login-Versuch

        return NextResponse.json(
          { error: 'Ungültige Anmeldedaten oder inaktiver Account' },
          { status: 401 }
        );
      }

      // Erfolgreiche Anmeldung - Token erstellen
      const token = createToken(staff);

      // Log erfolgreiche Anmeldung

      const response = NextResponse.json({
        success: true,
        user: {
          id: staff.id,
          name: staff.name,
          email: staff.email,
          role: staff.role,
          department: staff.department,
          permissions: staff.permissions,
        },
        token,
      });

      // HTTP-Only Cookie setzen
      response.cookies.set('taskilo_staff_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000, // 24 Stunden
      });

      return response;
    }

    if (action === 'logout') {
      const response = NextResponse.json({ success: true });
      response.cookies.delete('taskilo_staff_token');
      return response;
    }

    if (action === 'verify') {
      const cookieStore = await cookies();
      const token = cookieStore.get('taskilo_staff_token')?.value;

      if (!token) {
        return NextResponse.json({ authenticated: false }, { status: 401 });
      }

      const payload = verifyToken(token);
      if (!payload) {
        const response = NextResponse.json({ authenticated: false }, { status: 401 });
        response.cookies.delete('taskilo_staff_token');
        return response;
      }

      // Benutzer-Daten erneut validieren
      const staff = STAFF_CREDENTIALS.find(s => s.id === payload.id);
      if (!staff || staff.status !== 'active') {
        const response = NextResponse.json({ authenticated: false }, { status: 401 });
        response.cookies.delete('taskilo_staff_token');
        return response;
      }

      return NextResponse.json({
        authenticated: true,
        user: {
          id: staff.id,
          name: staff.name,
          email: staff.email,
          role: staff.role,
          department: staff.department,
          permissions: staff.permissions,
        },
      });
    }

    return NextResponse.json({ error: 'Ungültige Aktion' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Interner Server-Fehler' }, { status: 500 });
  }
}

export async function GET(_request: NextRequest) {
  // Token-Verifikation für GET-Requests
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('taskilo_staff_token')?.value;

    if (!token) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      const response = NextResponse.json({ authenticated: false }, { status: 401 });
      response.cookies.delete('taskilo_staff_token');
      return response;
    }

    const staff = STAFF_CREDENTIALS.find(s => s.id === payload.id);
    if (!staff || staff.status !== 'active') {
      const response = NextResponse.json({ authenticated: false }, { status: 401 });
      response.cookies.delete('taskilo_staff_token');
      return response;
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: staff.id,
        name: staff.name,
        email: staff.email,
        role: staff.role,
        department: staff.department,
        permissions: staff.permissions,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Interner Server-Fehler' }, { status: 500 });
  }
}
