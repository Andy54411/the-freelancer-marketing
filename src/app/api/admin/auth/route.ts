// src/app/api/admin/auth/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';

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
    email: 'andy@taskilo.com',
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
  },
  {
    id: 'emp_001',
    name: 'Elisabeth Schröder',
    email: 'elisabeth@taskilo.com',
    role: 'employee',
    departments: ['legal', 'privacy'],
    isActive: true,
    permissions: ['view_assigned', 'respond_emails'],
    passwordHash: 'emp123', // In production: bcrypt.hash('employee_password', 10)
  },
  {
    id: 'emp_002',
    name: 'Max Müller',
    email: 'max@taskilo.com',
    role: 'employee',
    departments: ['support', 'general'],
    isActive: true,
    permissions: ['view_assigned', 'respond_emails'],
    passwordHash: 'emp123',
  },
  {
    id: 'emp_003',
    name: 'Sarah Weber',
    email: 'sarah@taskilo.com',
    role: 'employee',
    departments: ['technical'],
    isActive: true,
    permissions: ['view_assigned', 'respond_emails', 'escalate'],
    passwordHash: 'emp123',
  },
  {
    id: 'emp_004',
    name: 'Thomas Schmidt',
    email: 'thomas@taskilo.com',
    role: 'employee',
    departments: ['business', 'billing'],
    isActive: true,
    permissions: ['view_assigned', 'respond_emails'],
    passwordHash: 'emp123',
  },
  {
    id: 'emp_005',
    name: 'Lisa Wagner',
    email: 'lisa@taskilo.com',
    role: 'employee',
    departments: ['disputes', 'mediation'],
    isActive: true,
    permissions: ['view_assigned', 'respond_emails', 'escalate'],
    passwordHash: 'emp123',
  },
  {
    id: 'emp_006',
    name: 'Michael Braun',
    email: 'michael@taskilo.com',
    role: 'employee',
    departments: ['press', 'marketing'],
    isActive: true,
    permissions: ['view_assigned', 'respond_emails'],
    passwordHash: 'emp123',
  },
];

// Simple JWT-like token creation (in production, use proper JWT with secret)
function createSessionToken(employee: Employee) {
  const payload = {
    id: employee.id,
    email: employee.email,
    role: employee.role,
    permissions: employee.permissions,
    exp: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
  };

  // In production, use proper JWT signing
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

function validateSessionToken(token: string) {
  try {
    const payload = JSON.parse(Buffer.from(token, 'base64').toString());

    if (payload.exp < Date.now()) {
      return null; // Token expired
    }

    return payload;
  } catch {
    return null; // Invalid token
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
      const sessionToken = createSessionToken(employee);

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
      return NextResponse.json({ success: false, error: 'No session found' }, { status: 401 });
    }

    const payload = validateSessionToken(sessionToken);
    if (!payload) {
      // Clear invalid cookie
      const cookieStore = await cookies();
      cookieStore.delete('taskilo_admin_session');
      return NextResponse.json(
        { success: false, error: 'Invalid or expired session' },
        { status: 401 }
      );
    }

    // Find current employee data
    const employee = EMPLOYEES.find(emp => emp.id === payload.id && emp.isActive);
    if (!employee) {
      const cookieStore = await cookies();
      cookieStore.delete('taskilo_admin_session');
      return NextResponse.json(
        { success: false, error: 'Employee not found or inactive' },
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

    return NextResponse.json(
      {
        success: false,
        error: 'Session verification failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
