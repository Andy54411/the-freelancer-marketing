import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'taskilo_admin_secret_key_2024'
);

export interface AdminAuthResult {
  success: boolean;
  employee?: {
    id: string;
    email: string;
    name: string;
    role: 'master' | 'support';
    permissions: string[];
  };
  error?: string;
}

/**
 * Validates session token (same as /api/admin/auth uses)
 */
async function validateSessionToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as { id: string; email: string; role: string; iat?: number; exp?: number };
  } catch (error) {
    return null; // Invalid token
  }
}

/**
 * Verifies admin authentication from request cookies (same as /api/admin/auth)
 */
export async function verifyAdminAuth(request: NextRequest): Promise<AdminAuthResult> {
  try {
    // Get admin session from cookies (same as /api/admin/auth uses)
    const adminToken = request.cookies.get('taskilo_admin_session')?.value;

    if (!adminToken) {
      return { success: false, error: 'No admin session' };
    }

    // Validate token using same logic as /api/admin/auth
    const payload = await validateSessionToken(adminToken);
    if (!payload) {
      return { success: false, error: 'Invalid admin session' };
    }

    // Mock employee data (should match /api/admin/auth data)
    const EMPLOYEES = [
      {
        id: 'master_001',
        name: 'Andy Staudinger',
        email: 'andy.staudinger@taskilo.de',
        role: 'master' as const,
        permissions: [
          'view_all',
          'reassign',
          'create_employee',
          'delete_employee',
          'manage_permissions',
        ],
      },
      {
        id: 'admin_001',
        name: 'Andy Staudinger',
        email: 'noreply@taskilo.de',
        role: 'support' as const,
        permissions: ['view_assigned', 'respond_emails', 'system_notifications'],
      },
    ];

    // Find employee by payload ID
    const employee = EMPLOYEES.find(emp => emp.id === payload.id);

    if (!employee) {
      return { success: false, error: 'Employee not found' };
    }

    return {
      success: true,
      employee: {
        id: employee.id,
        email: employee.email,
        name: employee.name,
        role: employee.role,
        permissions: employee.permissions,
      },
    };
  } catch (error) {
    console.error('Admin auth verification failed:', error);
    return { success: false, error: 'Authentication failed' };
  }
}
