// Admin-Benutzer API - Erstellen, Bearbeiten, Löschen von Admin-Benutzern
import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { AWSTicketStorage } from '@/lib/aws-ticket-storage';
import { AdminUser, AdminRole, DEFAULT_ADMIN_ROLES, getRoleById } from '@/lib/admin-roles';

// Temporäre In-Memory-Speicherung (bis AWS DynamoDB Integration)
const adminUsersStore: AdminUser[] = [
  {
    id: 'admin-1',
    email: 'andy.staudinger@taskilo.de',
    name: 'Andy Staudinger',
    role: DEFAULT_ADMIN_ROLES[0], // Master Admin
    departments: ['Management', 'Technical'],
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    lastLogin: '2024-08-13T10:30:00Z',
    loginCount: 45,
    createdBy: 'system',
    phone: '+49 123 456789',
    notes: 'System Administrator und Gründer',
  },
];

// JWT Secret für Admin-Tokens
const JWT_SECRET = new TextEncoder().encode(
  process.env.ADMIN_JWT_SECRET || 'taskilo-admin-secret-key-2024'
);

// Admin-Authentifizierung prüfen
async function verifyAdminAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get('taskilo-admin-token')?.value;

  if (!token) {
    throw new Error('Nicht autorisiert');
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload;
  } catch (error) {
    throw new Error('Ungültiger Token');
  }
}

// GET - Alle Admin-Benutzer abrufen
export async function GET(request: NextRequest) {
  try {
    // TODO: Auth temporär deaktiviert für Testing
    // await verifyAdminAuth();

    return NextResponse.json({
      success: true,
      adminUsers: adminUsersStore,
      count: adminUsersStore.length,
      message: 'Admin-Benutzer erfolgreich geladen',
    });
  } catch (error) {

    return NextResponse.json(
      {
        error: 'Fehler beim Laden der Admin-Benutzer',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// POST - Neuen Admin-Benutzer erstellen
export async function POST(request: NextRequest) {
  try {
    // TODO: Auth temporär deaktiviert für Testing
    // const authPayload = await verifyAdminAuth();
    const authPayload = { sub: 'current-admin' }; // Temporär

    const body = await request.json();

    const { email, name, phone, roleId, departments, notes } = body;

    if (!email || !name || !roleId) {
      return NextResponse.json(
        { error: 'E-Mail, Name und Rolle sind erforderlich' },
        { status: 400 }
      );
    }

    const role = getRoleById(roleId);
    if (!role) {
      return NextResponse.json({ error: 'Ungültige Rolle' }, { status: 400 });
    }

    // Prüfen ob E-Mail bereits existiert
    const existingUser = adminUsersStore.find(user => user.email === email);
    if (existingUser) {
      return NextResponse.json({ error: 'E-Mail-Adresse wird bereits verwendet' }, { status: 400 });
    }

    const newAdminUser: AdminUser = {
      id: `admin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      email,
      name,
      phone: phone || '',
      role,
      departments: departments || [],
      isActive: true,
      createdAt: new Date().toISOString(),
      loginCount: 0,
      createdBy: authPayload?.sub || 'unknown',
      notes: notes || '',
    };

    // In In-Memory Store speichern
    adminUsersStore.push(newAdminUser);

    // TODO: Send welcome email with login credentials

    return NextResponse.json({
      success: true,
      adminUser: newAdminUser,
      message: `Admin-Benutzer ${name} erfolgreich erstellt`,
    });
  } catch (error) {

    return NextResponse.json(
      {
        error: 'Fehler beim Erstellen des Admin-Benutzers',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// PUT - Admin-Benutzer aktualisieren
export async function PUT(request: NextRequest) {
  try {
    // TODO: Auth temporär deaktiviert für Testing
    // const authPayload = await verifyAdminAuth();
    const { id, ...updates } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Benutzer-ID ist erforderlich' }, { status: 400 });
    }

    const userIndex = adminUsersStore.findIndex(user => user.id === id);
    if (userIndex === -1) {
      return NextResponse.json({ error: 'Admin-Benutzer nicht gefunden' }, { status: 404 });
    }

    // Benutzer aktualisieren
    adminUsersStore[userIndex] = { ...adminUsersStore[userIndex], ...updates };

    return NextResponse.json({
      success: true,
      adminUser: adminUsersStore[userIndex],
      message: 'Admin-Benutzer erfolgreich aktualisiert',
    });
  } catch (error) {

    return NextResponse.json(
      {
        error: 'Fehler beim Aktualisieren des Admin-Benutzers',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// DELETE - Admin-Benutzer löschen
export async function DELETE(request: NextRequest) {
  try {
    // TODO: Auth temporär deaktiviert für Testing
    // const authPayload = await verifyAdminAuth();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Benutzer-ID ist erforderlich' }, { status: 400 });
    }

    const userIndex = adminUsersStore.findIndex(user => user.id === id);
    if (userIndex === -1) {
      return NextResponse.json({ error: 'Admin-Benutzer nicht gefunden' }, { status: 404 });
    }

    const user = adminUsersStore[userIndex];

    // Master Admin darf nicht gelöscht werden
    if (user.role.id === 'master-admin') {
      return NextResponse.json(
        { error: 'Master Admin kann nicht gelöscht werden' },
        { status: 400 }
      );
    }

    // Benutzer aus Store entfernen
    adminUsersStore.splice(userIndex, 1);

    return NextResponse.json({
      success: true,
      message: 'Admin-Benutzer erfolgreich gelöscht',
    });
  } catch (error) {

    return NextResponse.json(
      {
        error: 'Fehler beim Löschen des Admin-Benutzers',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
