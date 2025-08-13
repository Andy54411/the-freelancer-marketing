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
  } catch (_error) {
    return null; // Invalid or expired token
  }
}

// POST /api/admin/auth - Login
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, email, password } = body as LoginCredentials & { action: string };

    // ERWEITERTE AUTH-LOGGING IMPLEMENTIERUNG
    const timestamp = new Date().toISOString();
    const userAgent = request.headers.get('user-agent') || 'Unknown';
    const ip =
      request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

    console.log(`=== 🔐 ADMIN AUTH ACTIVITY LOG [${timestamp}] ===`);
    console.log(`📧 Email: ${email}`);
    console.log(`🎯 Action: ${action}`);
    console.log(`🌐 IP: ${ip}`);
    console.log(`💻 User-Agent: ${userAgent}`);
    console.log(`⏰ Timestamp: ${timestamp}`);

    if (action === 'login') {
      if (!email || !password) {
        console.log(
          `❌ LOGIN FAILED: Missing credentials - Email: ${email}, Password: ${password ? '[PROVIDED]' : '[MISSING]'}`
        );
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
        console.log(`❌ LOGIN FAILED: User not found or inactive - Email: ${email}`);
        console.log(`📊 Available emails: ${EMPLOYEES.map(e => e.email).join(', ')}`);
        return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 });
      }

      // Verify password (in production, use bcrypt.compare)
      if (employee.passwordHash !== password) {
        console.log(`❌ LOGIN FAILED: Invalid password for user ${email}`);
        console.log(`🔍 Expected: ${employee.passwordHash}, Received: ${password}`);
        return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 });
      }

      // ERFOLGREICHER LOGIN - DETAILLIERTES LOGGING
      console.log(`✅ LOGIN SUCCESSFUL:`);
      console.log(`   👤 User: ${employee.name} (${employee.email})`);
      console.log(`   🏷️  Role: ${employee.role}`);
      console.log(`   🏢 Departments: ${employee.departments.join(', ')}`);
      console.log(`   🔑 Permissions: ${employee.permissions.join(', ')}`);
      console.log(`   📅 Previous Login: ${employee.lastLogin || 'First login'}`);

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
        const previousLogin = EMPLOYEES[employeeIndex].lastLogin;
        EMPLOYEES[employeeIndex] = {
          ...EMPLOYEES[employeeIndex],
          lastLogin: timestamp,
        };
        console.log(`🔄 Updated lastLogin: ${previousLogin} → ${timestamp}`);
      }

      console.log(`🎟️  Session Token Generated: ${sessionToken.substring(0, 20)}...`);
      console.log(`🍪 Cookie Set: taskilo_admin_session (24h expiry)`);
      console.log(`=== END AUTH LOG ===\n`);

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
      console.log(`🚪 LOGOUT INITIATED for session`);

      // Clear session cookie
      const cookieStore = await cookies();
      const sessionToken = cookieStore.get('taskilo_admin_session')?.value;

      if (sessionToken) {
        const payload = await validateSessionToken(sessionToken);
        if (payload) {
          console.log(`✅ LOGOUT SUCCESSFUL: ${payload.email} (${payload.role})`);
        }
      }

      cookieStore.delete('taskilo_admin_session');
      console.log(`🍪 Session cookie cleared`);
      console.log(`=== END AUTH LOG ===\n`);

      return NextResponse.json({
        success: true,
        message: 'Logged out successfully',
      });
    }

    console.log(`❌ INVALID ACTION: ${action}`);
    console.log(`=== END AUTH LOG ===\n`);
    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error(`💥 AUTH ERROR:`, error);
    console.error(`📊 Error Details:`, {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });
    console.log(`=== END AUTH LOG ===\n`);

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
    const timestamp = new Date().toISOString();
    const userAgent = request.headers.get('user-agent') || 'Unknown';
    const ip =
      request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

    console.log(`=== 🔍 SESSION VERIFICATION LOG [${timestamp}] ===`);
    console.log(`🌐 IP: ${ip}`);
    console.log(`💻 User-Agent: ${userAgent}`);

    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('taskilo_admin_session')?.value;

    if (!sessionToken) {
      console.log(`❌ SESSION CHECK FAILED: No session token found`);
      console.log(
        `🍪 Available cookies: ${
          cookieStore
            .getAll()
            .map(c => c.name)
            .join(', ') || 'None'
        }`
      );
      console.log(`=== END SESSION LOG ===\n`);

      return NextResponse.json(
        {
          success: false,
          error: 'No session found',
          employee: null,
        },
        { status: 401 }
      );
    }

    console.log(`🎟️  Session Token Found: ${sessionToken.substring(0, 20)}...`);

    const payload = await validateSessionToken(sessionToken);
    if (!payload) {
      console.log(`❌ SESSION CHECK FAILED: Invalid or expired token`);

      // Clear invalid cookie
      cookieStore.delete('taskilo_admin_session');
      console.log(`🧹 Invalid session cookie cleared`);
      console.log(`=== END SESSION LOG ===\n`);

      return NextResponse.json(
        {
          success: false,
          error: 'Invalid or expired session',
          employee: null,
        },
        { status: 401 }
      );
    }

    console.log(`✅ TOKEN VALID:`);
    console.log(`   👤 User ID: ${payload.id}`);
    console.log(`   📧 Email: ${payload.email}`);
    console.log(`   🏷️  Role: ${payload.role}`);
    console.log(
      `   ⏱️  Issued: ${payload.iat ? new Date(payload.iat * 1000).toISOString() : 'Unknown'}`
    );
    console.log(
      `   ⏰ Expires: ${payload.exp ? new Date(payload.exp * 1000).toISOString() : 'Unknown'}`
    );

    // Find current employee data
    const employee = EMPLOYEES.find(emp => emp.id === payload.id && emp.isActive);
    if (!employee) {
      console.log(`❌ SESSION CHECK FAILED: Employee not found or inactive (ID: ${payload.id})`);
      console.log(
        `📊 Available employees: ${EMPLOYEES.filter(e => e.isActive)
          .map(e => `${e.id}:${e.email}`)
          .join(', ')}`
      );

      cookieStore.delete('taskilo_admin_session');
      console.log(`🧹 Invalid employee session cookie cleared`);
      console.log(`=== END SESSION LOG ===\n`);

      return NextResponse.json(
        {
          success: false,
          error: 'Employee not found or inactive',
          employee: null,
        },
        { status: 401 }
      );
    }

    console.log(`✅ SESSION VERIFICATION SUCCESSFUL:`);
    console.log(`   👤 Employee: ${employee.name} (${employee.email})`);
    console.log(`   🏢 Departments: ${employee.departments.join(', ')}`);
    console.log(`   🔑 Permissions: ${employee.permissions.join(', ')}`);
    console.log(`   📅 Last Login: ${employee.lastLogin || 'Never'}`);
    console.log(`=== END SESSION LOG ===\n`);

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
    console.error(`💥 SESSION VERIFICATION ERROR:`, error);
    console.error(`📊 Error Details:`, {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });
    console.log(`=== END SESSION LOG ===\n`);

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
