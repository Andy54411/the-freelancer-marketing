import { NextRequest, NextResponse } from 'next/server';
import { checkAdminApproval } from '@/lib/adminApprovalMiddleware';

/**
 * GET /api/company/[uid]/approval-status
 * Checks the admin approval status for a company
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
  try {
    const { uid } = await params;

    if (!uid) {
      return NextResponse.json({ error: 'Company ID ist erforderlich' }, { status: 400 });
    }

    // Check admin approval status
    const approvalResult = await checkAdminApproval(uid);

    // Determine pending actions based on company data
    const pendingActions: string[] = [];

    if (approvalResult.companyData && !approvalResult.isApproved) {
      const data = approvalResult.companyData;

      // Check for missing documents - Dokumente sind in step5 gespeichert
      if (!data.step5?.identityFrontUrl || !data.step5?.identityBackUrl) {
        pendingActions.push('Ausweisdokumente hochladen');
      }

      if (!data.step5?.businessLicenseUrl) {
        pendingActions.push('Gewerbeschein hochladen');
      }

      // Bankdaten prüfen (in step4 oder step5)
      if (!data.step4?.iban && !data.step5?.iban && !data.iban) {
        pendingActions.push('Bankverbindung einrichten');
      }

      if (!data.onboardingCompleted) {
        pendingActions.push('Onboarding abschließen');
      }

      if (pendingActions.length === 0) {
        pendingActions.push('Warten auf Admin-Überprüfung');
      }
    }

    const response = {
      companyId: uid,
      isApproved: approvalResult.isApproved,
      approvalStatus: approvalResult.companyData?.approvalStatus || 'pending',
      adminApproved: approvalResult.companyData?.adminApproved || false,
      adminApprovedAt: approvalResult.companyData?.adminApprovedAt?.toDate?.()?.toISOString(),
      adminApprovedBy: approvalResult.companyData?.adminApprovedBy,
      adminNotes: approvalResult.companyData?.adminNotes,
      profileStatus: approvalResult.companyData?.profileStatus || 'pending_review',
      accountSuspended: approvalResult.companyData?.accountSuspended || false,
      suspendedAt: approvalResult.companyData?.suspendedAt?.toDate?.()?.toISOString(),
      suspendedBy: approvalResult.companyData?.suspendedBy,
      suspensionReason: approvalResult.companyData?.suspensionReason,
      pendingActions,
      errorCode: approvalResult.errorCode,
      checkTimestamp: new Date().toISOString(),
    };

    // If approved, return success response
    if (approvalResult.isApproved) {
      return NextResponse.json(response);
    }

    // If not approved, still return the data but with appropriate status
    return NextResponse.json(response, { status: 200 }); // 200 because it's valid data, not an error
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Fehler beim Überprüfen des Freigabe-Status',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
