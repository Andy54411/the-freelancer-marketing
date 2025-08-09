import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';
import { verifyAdminAuth } from '@/lib/admin-auth';

/**
 * Admin API: Approve company onboarding
 * Requires admin authentication
 */
export async function POST(request: NextRequest) {
  // Verify admin authentication
  const adminAuth = await verifyAdminAuth(request);
  if (!adminAuth.success) {
    return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
  }

  try {
    const { companyId } = await request.json();

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
    }

    console.log(`[Admin API] Approving company: ${companyId}`);

    // Update onboarding status to approved
    await db.collection('users').doc(companyId).collection('onboarding').doc('progress').update({
      status: 'approved',
      approvedAt: new Date(),
      approvedBy: 'admin_approval_system',
    });

    console.log(`[Admin API] Company ${companyId} approved successfully`);

    return NextResponse.json({
      success: true,
      message: 'Company approved successfully',
    });
  } catch (error) {
    console.error('[Admin API] Error approving company:', error);
    return NextResponse.json(
      {
        error: 'Failed to approve company',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
