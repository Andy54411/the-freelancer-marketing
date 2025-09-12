import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';

/**
 * POST /api/company/[uid]/notifications/approval
 * Sends notifications when admin approval status changes
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
  try {
    const { uid } = await params;
    const body = await request.json();
    const { type, status, adminNotes, adminApprovedBy } = body;

    if (!uid || !type) {
      return NextResponse.json(
        { error: 'Company ID und Notification Type sind erforderlich' },
        { status: 400 }
      );
    }

    const timestamp = new Date().toISOString();

    // Create notification document
    const notificationData = {
      companyId: uid,
      type: type, // 'approval_granted', 'approval_rejected', 'approval_pending'
      status: status || 'unread',
      title: getNotificationTitle(type),
      message: getNotificationMessage(type, adminNotes, adminApprovedBy),
      adminNotes: adminNotes || null,
      adminApprovedBy: adminApprovedBy || null,
      createdAt: timestamp,
      readAt: null,
      metadata: {
        source: 'admin_approval_system',
        priority: type === 'approval_granted' ? 'high' : 'medium',
      },
    };

    // Save notification to Firebase
    const notificationRef = await db.collection('notifications').add(notificationData);

    // Also update company's last notification timestamp
    await db.collection('companies').doc(uid).update({
      lastNotificationAt: timestamp,
      lastNotificationType: type,
    });

    return NextResponse.json({
      success: true,
      notificationId: notificationRef.id,
      message: 'Benachrichtigung erfolgreich erstellt',
      data: notificationData,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Fehler beim Erstellen der Benachrichtigung',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

function getNotificationTitle(type: string): string {
  switch (type) {
    case 'approval_granted':
      return 'Account freigegeben!';
    case 'approval_rejected':
      return 'Account-Überprüfung erforderlich';
    case 'approval_pending':
      return 'Account wird überprüft';
    case 'account_suspended':
      return 'Account wurde gesperrt';
    case 'account_unsuspended':
      return 'Account wurde entsperrt';
    default:
      return 'Freigabe-Status Update';
  }
}

function getNotificationMessage(
  type: string,
  adminNotes?: string,
  adminApprovedBy?: string
): string {
  switch (type) {
    case 'approval_granted':
      return `Ihr Taskilo-Account wurde erfolgreich freigegeben! Sie können nun alle Platform-Features nutzen, Aufträge annehmen und Zahlungen empfangen.${adminApprovedBy ? ` Freigegeben von: ${adminApprovedBy}` : ''}`;

    case 'approval_rejected':
      return `Ihr Account konnte nicht freigegeben werden. Bitte überprüfen Sie die Admin-Notizen und nehmen Sie entsprechende Korrekturen vor.${adminNotes ? ` Begründung: ${adminNotes}` : ''}`;

    case 'approval_pending':
      return 'Ihr Account wird gerade von unserem Team überprüft. Sie erhalten eine Benachrichtigung, sobald die Überprüfung abgeschlossen ist.';

    case 'account_suspended':
      return `Ihr Taskilo-Account wurde gesperrt und alle Funktionen sind deaktiviert. Kontaktieren Sie den Support für weitere Informationen.${adminNotes ? ` Grund: ${adminNotes}` : ''}`;

    case 'account_unsuspended':
      return `Ihr Taskilo-Account wurde entsperrt und alle Funktionen sind wieder verfügbar. Sie können alle Platform-Features nutzen.${adminNotes ? ` Notiz: ${adminNotes}` : ''}`;

    default:
      return 'Der Status Ihres Accounts wurde aktualisiert.';
  }
}
