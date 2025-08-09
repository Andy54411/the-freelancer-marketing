import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';
import { verifyAdminAuth } from '@/lib/admin-auth';

/**
 * Admin API: Reject company onboarding
 * Requires admin authentication
 */
export async function POST(request: NextRequest) {
  // Verify admin authentication
  const adminAuth = await verifyAdminAuth(request);
  if (!adminAuth.success) {
    return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
  }

  try {
    const { companyId, reason } = await request.json();

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
    }

    console.log(`[Admin API] Rejecting company: ${companyId}, reason: ${reason}`);

    // Update onboarding status to rejected
    await db
      .collection('users')
      .doc(companyId)
      .collection('onboarding')
      .doc('progress')
      .update({
        status: 'rejected',
        rejectedAt: new Date(),
        rejectedBy: 'admin_rejection_system',
        rejectionReason: reason || 'Keine Begründung angegeben',
      });

    console.log(`[Admin API] Company ${companyId} rejected successfully`);

    return NextResponse.json({
      success: true,
      message: 'Company rejected successfully',
    });
  } catch (error) {
    console.error('[Admin API] Error rejecting company:', error);
    return NextResponse.json(
      {
        error: 'Failed to reject company',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
