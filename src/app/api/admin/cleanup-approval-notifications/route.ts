import { NextRequest, NextResponse } from 'next/server';
import { db, isFirebaseAvailable } from '@/firebase/server';

/**
 * POST /api/admin/cleanup-approval-notifications
 * Löscht alte "Prüfung"-Notifications für bereits freigegebene Unternehmen
 */
export async function POST(request: NextRequest) {
  try {
    if (!isFirebaseAvailable() || !db) {
      return NextResponse.json(
        { success: false, error: 'Service temporarily unavailable' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { companyId } = body;

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID erforderlich' }, { status: 400 });
    }

    // Prüfe ob Company approved ist
    const companyDoc = await db!.collection('companies').doc(companyId).get();

    if (!companyDoc.exists) {
      return NextResponse.json({ error: 'Company nicht gefunden' }, { status: 404 });
    }

    const companyData = companyDoc.data();
    const isApproved =
      companyData?.adminApproved === true || companyData?.approvalStatus === 'approved';

    if (!isApproved) {
      return NextResponse.json({
        success: false,
        message: 'Company ist nicht freigegeben - keine Cleanup notwendig',
      });
    }

    // Lösche alte approval_status_update Notifications
    const oldNotificationsSnapshot = await db!
      .collection('notifications')
      .where('userId', '==', companyId)
      .where('type', '==', 'approval_status_update')
      .get();

    const deletePromises = oldNotificationsSnapshot.docs.map(doc => doc.ref.delete());
    await Promise.all(deletePromises);

    return NextResponse.json({
      success: true,
      message: `${oldNotificationsSnapshot.size} alte Approval-Notifications gelöscht`,
      companyId,
      deletedCount: oldNotificationsSnapshot.size,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Fehler beim Cleanup der Notifications',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
