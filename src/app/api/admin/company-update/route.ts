import { NextRequest, NextResponse } from 'next/server';
import { db, isFirebaseAvailable } from '@/firebase/server';

/**
 * POST /api/admin/company-update
 * Direkte Company-Update für Testing
 */
export async function POST(request: NextRequest) {
  try {
    // Check if Firebase is properly initialized
    if (!isFirebaseAvailable() || !db) {
      console.error('Firebase not initialized');
      return NextResponse.json(
        { success: false, error: 'Service temporarily unavailable' },
        { status: 503 }
      );
    }

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

    await db!.collection('companies').doc(companyId).update(updateData);

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
          link: `/dashboard/company/${companyId}`,
          isRead: false,
        }),
      });

      if (response.ok) {
      } else {
      }
    }

    return NextResponse.json({
      success: true,
      message: `Company adminApproved updated to ${adminApproved}`,
      companyId,
      updateData,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Fehler beim Aktualisieren der Company',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
