// src/app/api/admin/auth/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';

interface LoginCredentials {
  email: string;
  password: string;
}

interface Employee {
  id: string;
  name: string;
  email: string;
  role: 'master' | 'employee';
  departments: string[];
  isActive: boolean;
  permissions: string[];
  passwordHash: string; // In production, use proper hashing
  lastLogin?: string; // Optional last login timestamp
}

// Mock employee data with credentials (in production, use database with hashed passwords)
const EMPLOYEES: Employee[] = [
  {
    id: 'master_001',
    name: 'Andy Staudinger',
    email: 'andy.staudinger@taskilo.de',
    role: 'master',
    departments: ['all'],
    isActive: true,
    permissions: [
      'view_all',
      'reassign',
      'create_employee',
      'delete_employee',
      'manage_permissions',
    ],
    passwordHash: 'master123', // In production: bcrypt.hash('secure_password', 10)
    lastLogin: '2025-07-16T08:00:00Z', // Vor 6 Tagen
  },
  {
    id: 'admin_001',
    name: 'Andy Staudinger',
    email: 'noreply@taskilo.de',
    role: 'employee',
    departments: ['system', 'notifications'],
    isActive: true,
    permissions: ['view_assigned', 'respond_emails', 'system_notifications'],
    passwordHash: 'admin123',
    // Noch nicht angemeldet - lastLogin undefined
  },
  {
    id: 'admin_002',
    name: 'Andy Staudinger',
    email: 'support@taskilo.de',
    role: 'employee',
    departments: ['support', 'general'],
    isActive: true,
    permissions: ['view_assigned', 'respond_emails', 'escalate'],
    passwordHash: 'support123',
    // Noch nicht angemeldet - lastLogin undefined
  },
  {
    id: 'emp_001',
    name: 'Elisabeth Schröder',
    email: 'newsletter@taskilo.de',
    role: 'employee',
    departments: ['marketing', 'newsletter'],
    isActive: true,
    permissions: ['view_assigned', 'respond_emails', 'newsletter_manage'],
    passwordHash: 'newsletter123',
    // Noch nicht angemeldet - lastLogin undefined
  },
];

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'taskilo_admin_secret_key_2024'
);

// Simple JWT-like token creation (in production, use proper JWT with secret)
async function createSessionToken(employee: Employee) {
  const jwt = await new SignJWT({
    id: employee.id,
    email: employee.email,
    role: employee.role,
    permissions: employee.permissions,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(JWT_SECRET);

  return jwt;
}

async function validateSessionToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as {
      id: string;
      email: string;
      role: string;
      permissions: string[];
      iat?: number;
      exp?: number;
    };
  } catch (error) {
    return null; // Invalid or expired token
  }
}

// POST /api/admin/auth - Login
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, email, password } = body as LoginCredentials & { action: string };

    console.log('[API /admin/auth] POST request:', { action, email });

    if (action === 'login') {
      if (!email || !password) {
        return NextResponse.json(
          { success: false, error: 'Email and password required' },
          { status: 400 }
        );
      }

      // Find employee by email
      const employee = EMPLOYEES.find(
        emp => emp.email.toLowerCase() === email.toLowerCase() && emp.isActive
      );

      if (!employee) {
        return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 });
      }

      // Verify password (in production, use bcrypt.compare)
      if (employee.passwordHash !== password) {
        return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 });
      }

      // Create session token
      const sessionToken = await createSessionToken(employee);

      // Set cookie
      const cookieStore = await cookies();
      cookieStore.set('taskilo_admin_session', sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60, // 24 hours
        path: '/',
      });

      // Update last login (in production, update database)
      const employeeIndex = EMPLOYEES.findIndex(emp => emp.id === employee.id);
      if (employeeIndex !== -1) {
        EMPLOYEES[employeeIndex] = {
          ...EMPLOYEES[employeeIndex],
          lastLogin: new Date().toISOString(),
        };
      }

      return NextResponse.json({
        success: true,
        employee: {
          id: employee.id,
          name: employee.name,
          email: employee.email,
          role: employee.role,
          departments: employee.departments,
          permissions: employee.permissions,
        },
        sessionToken,
      });
    }

    if (action === 'logout') {
      // Clear session cookie
      const cookieStore = await cookies();
      cookieStore.delete('taskilo_admin_session');

      return NextResponse.json({
        success: true,
        message: 'Logged out successfully',
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('[API /admin/auth] Error in POST:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Authentication failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// GET /api/admin/auth - Verify session
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('taskilo_admin_session')?.value;

    if (!sessionToken) {
      return NextResponse.json(
        {
          success: false,
          error: 'No session found',
          // Temporärer Fallback während Produktionsproblemen
          employee: null,
        },
        { status: 401 }
      );
    }

    const payload = await validateSessionToken(sessionToken);
    if (!payload) {
      // Clear invalid cookie
      const cookieStore = await cookies();
      cookieStore.delete('taskilo_admin_session');
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid or expired session',
          // Temporärer Fallback während Produktionsproblemen
          employee: null,
        },
        { status: 401 }
      );
    }

    // Find current employee data
    const employee = EMPLOYEES.find(emp => emp.id === payload.id && emp.isActive);
    if (!employee) {
      const cookieStore = await cookies();
      cookieStore.delete('taskilo_admin_session');
      return NextResponse.json(
        {
          success: false,
          error: 'Employee not found or inactive',
          // Temporärer Fallback während Produktionsproblemen
          employee: null,
        },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      employee: {
        id: employee.id,
        name: employee.name,
        email: employee.email,
        role: employee.role,
        departments: employee.departments,
        permissions: employee.permissions,
      },
      sessionValid: true,
    });
  } catch (error) {
    console.error('[API /admin/auth] Error in GET:', error);

    // Fallback-Antwort statt 500-Fehler
    return NextResponse.json(
      {
        success: false,
        error: 'Session verification failed',
        employee: null,
        message:
          process.env.NODE_ENV === 'development'
            ? error instanceof Error
              ? error.message
              : 'Unknown error'
            : 'Authentication temporarily unavailable',
      },
      { status: 401 }
    );
  }
}
