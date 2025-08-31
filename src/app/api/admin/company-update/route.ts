import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';

/**
 * POST /api/admin/company-update
 * Direkte Company-Update für Testing
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyId, adminApproved } = body;

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID erforderlich' }, { status: 400 });
    }

    const now = new Date().toISOString();

    const updateData: any = {
      adminApproved: adminApproved === true || adminApproved === 'true',
      adminApprovedAt: adminApproved ? now : null,
      adminApprovedBy: adminApproved ? 'current-admin' : null,
      approvalStatus: adminApproved ? 'approved' : 'pending',
      updatedAt: now,
      lastModifiedBy: 'current-admin',
    };

    await db.collection('companies').doc(companyId).update(updateData);

    // Automatische Benachrichtigung erstellen für Bell
    if (!adminApproved) {
      // Global notification für Header Bell über die richtige API
      const response = await fetch(`https://taskilo.de/api/notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: companyId,
          type: 'approval_status_update',
          title: 'Freigabe-Status Update',
          message:
            'Ihr Unternehmen befindet sich derzeit in der Prüfung. Wir werden Sie informieren, sobald die Überprüfung abgeschlossen ist.',
          link: '/dashboard/company',
          isRead: false,
        }),
      });

      if (response.ok) {
        console.log(`✅ Automatic global notification created for company ${companyId}`);
      } else {
        console.error('❌ Failed to create global notification');
      }
    }

    console.log(`✅ Company ${companyId} adminApproved updated to:`, adminApproved);

    return NextResponse.json({
      success: true,
      message: `Company adminApproved updated to ${adminApproved}`,
      companyId,
      updateData,
    });
  } catch (error) {
    console.error('Error updating company:', error);
    return NextResponse.json(
      {
        error: 'Fehler beim Aktualisieren der Company',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
