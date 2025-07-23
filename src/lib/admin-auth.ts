import { NextRequest, NextResponse } from 'next/server';

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
 * Verifies admin authentication from request cookies (similar to /api/admin/auth)
 */
export async function verifyAdminAuth(request: NextRequest): Promise<AdminAuthResult> {
  try {
    // Get admin session from cookies (same as /api/admin/auth uses)
    const adminToken = request.cookies.get('admin-token')?.value;

    if (!adminToken) {
      return { success: false, error: 'No admin session' };
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

    // Simple token verification (in production, use proper JWT verification)
    const employee = EMPLOYEES.find(emp => `token_${emp.id}` === adminToken);

    if (!employee) {
      return { success: false, error: 'Invalid admin session' };
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
