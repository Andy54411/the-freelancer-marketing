import { NextRequest, NextResponse } from 'next/server';
import { admin } from '@/firebase/server';

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
 * Verifies admin authentication from request headers
 */
export async function verifyAdminAuth(request: NextRequest): Promise<AdminAuthResult> {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { success: false, error: 'No authorization header' };
    }

    const idToken = authHeader.replace('Bearer ', '');
    const decodedToken = await admin.auth().verifyIdToken(idToken);

    // Check if user has admin role
    if (!decodedToken.role || (decodedToken.role !== 'master' && decodedToken.role !== 'support')) {
      return { success: false, error: 'Insufficient permissions' };
    }

    // Get employee data from Firestore
    const employeeDoc = await admin.firestore().collection('employees').doc(decodedToken.uid).get();

    if (!employeeDoc.exists) {
      return { success: false, error: 'Employee record not found' };
    }

    const employeeData = employeeDoc.data();

    return {
      success: true,
      employee: {
        id: decodedToken.uid,
        email: decodedToken.email || '',
        name: employeeData?.name || 'Admin',
        role: decodedToken.role as 'master' | 'support',
        permissions: employeeData?.permissions || [],
      },
    };
  } catch (error) {
    console.error('Admin auth verification failed:', error);
    return { success: false, error: 'Authentication failed' };
  }
}
