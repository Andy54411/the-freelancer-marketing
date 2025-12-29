import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db, isFirebaseAvailable } from '@/firebase/server';
import { Timestamp } from 'firebase-admin/firestore';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

// Admin JWT Secret
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'taskilo-jwt-secret-key');

// Verify admin authentication
async function verifyAdminAuth(
  request: NextRequest
): Promise<{ isValid: boolean; userId?: string; error?: string }> {
  try {
    const cookieStore = await cookies();
    const adminToken = cookieStore.get('taskilo_admin_session')?.value;

    if (adminToken) {
      try {
        const { payload } = await jwtVerify(adminToken, JWT_SECRET);
        const decoded = payload as any;
        if (decoded.role === 'admin') {
          return { isValid: true, userId: decoded.userId };
        }
      } catch (error) {}
    }
  } catch (error) {}

  return { isValid: false, error: 'Keine gültige Admin-Authentifizierung gefunden' };
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Check if Firebase is properly initialized
    if (!isFirebaseAvailable() || !db) {
      console.error('Firebase not initialized');
      return NextResponse.json(
        { success: false, error: 'Service temporarily unavailable' },
        { status: 503 }
      );
    }

    // Verify admin authentication
    const authResult = await verifyAdminAuth(request);
    if (!authResult.isValid) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const { id: companyId } = await params;
    const body = await request.json();
    const { action, notes, adminId } = body;

    if (!action || !['approve', 'reject', 'suspend', 'unsuspend'].includes(action)) {
      return NextResponse.json(
        { error: 'Ungültige Aktion. Erlaubt: approve, reject, suspend, unsuspend' },
        { status: 400 }
      );
    }

    if (!companyId) {
      return NextResponse.json({ error: 'Firmen-ID ist erforderlich' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const adminUserId = authResult.userId || adminId || 'unknown-admin';

    // Update company approval status in Firebase
    const updateData: any = {
      updatedAt: now,
      lastModifiedBy: adminUserId,
    };

    if (action === 'approve') {
      updateData.adminApproved = true;
      updateData.adminApprovedAt = now;
      updateData.adminApprovedBy = adminUserId;
      updateData.approvalStatus = 'approved';
      updateData.accountSuspended = false;
      updateData.suspendedAt = null;
      updateData.suspendedBy = null;
      if (notes) {
        updateData.adminNotes = notes;
      }
    } else if (action === 'reject') {
      updateData.adminApproved = false;
      updateData.adminApprovedAt = null;
      updateData.adminApprovedBy = null;
      updateData.approvalStatus = 'rejected';
      updateData.adminNotes = notes || 'Keine Begründung angegeben';
    } else if (action === 'suspend') {
      updateData.accountSuspended = true;
      updateData.suspendedAt = now;
      updateData.suspendedBy = adminUserId;
      updateData.suspensionReason = notes || 'Keine Begründung angegeben';
      updateData.adminApproved = false; // Suspended accounts are not approved
    } else if (action === 'unsuspend') {
      updateData.accountSuspended = false;
      updateData.suspendedAt = null;
      updateData.suspendedBy = null;
      updateData.suspensionReason = null;
      if (notes) {
        updateData.adminNotes = notes;
      }
    }

    // Update in Firebase
    await db!.collection('companies').doc(companyId).update(updateData);

    // Log admin action for audit trail
    await db!.collection('admin_logs').add({
      action: `company_${action}`,
      adminId: adminUserId,
      targetId: companyId,
      targetType: 'company',
      details: {
        action,
        notes,
        companyId,
      },
      timestamp: now,
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    });

    // Send notification to company about approval status change
    try {
      let notificationType = 'approval_pending';

      if (action === 'approve') {
        notificationType = 'approval_granted';
      } else if (action === 'reject') {
        notificationType = 'approval_rejected';
      } else if (action === 'suspend') {
        notificationType = 'account_suspended';
      } else if (action === 'unsuspend') {
        notificationType = 'account_unsuspended';
      }

      // DIREKT in Firebase schreiben - KEIN fetch!
      const companyNotificationData = {
        type: notificationType,
        status: 'unread',
        adminNotes: notes,
        adminApprovedBy: adminUserId,
        createdAt: Timestamp.now(), // FIRESTORE TIMESTAMP statt String!
        id: `approval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      };

      await db
        .collection('companies')
        .doc(companyId)
        .collection('notifications')
        .add(companyNotificationData);

      // ZUSÄTZLICH: Erstelle globale User-Benachrichtigung für Header-Bell
      let globalTitle = 'Status-Update';
      let globalMessage = 'Ihr Account-Status wurde aktualisiert.';

      if (action === 'approve') {
        globalTitle = '🎉 Profil freigegeben!';
        globalMessage =
          'Glückwunsch! Ihr Unternehmensprofil wurde von einem Administrator freigegeben. Sie können jetzt alle Platform-Features nutzen.';
      } else if (action === 'reject') {
        globalTitle = '⚠️ Überprüfung erforderlich';
        globalMessage =
          'Ihr Profil konnte nicht freigegeben werden. Bitte überprüfen Sie die Admin-Notizen und nehmen Sie entsprechende Korrekturen vor.';
      } else if (action === 'suspend') {
        globalTitle = '🚫 Account gesperrt';
        globalMessage =
          'Ihr Account wurde gesperrt. Kontaktieren Sie den Support für weitere Informationen.';
      } else if (action === 'unsuspend') {
        globalTitle = '✅ Account entsperrt';
        globalMessage = 'Ihr Account wurde entsperrt und alle Funktionen sind wieder verfügbar.';
      }

      // Direkte Notification-Erstellung ohne fetch (im gleichen Server)
      const notificationData = {
        userId: companyId,
        type: 'approval',
        title: globalTitle,
        message: globalMessage,
        link: `/dashboard/company/${companyId}`, // RELATIVER Link!
        isRead: false,
        createdAt: Timestamp.now(), // FIRESTORE TIMESTAMP statt String!
        id: `approval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      };

      // Direkt in Firestore schreiben statt fetch
      await db!.collection('notifications').add(notificationData);

      const globalNotificationResponse = { ok: true }; // Dummy response für bestehende Logik

      if (!globalNotificationResponse.ok) {
      }
    } catch (notificationError) {}

    return NextResponse.json({
      success: true,
      message: `Unternehmen wurde erfolgreich ${
        action === 'approve'
          ? 'freigegeben'
          : action === 'reject'
            ? 'abgelehnt'
            : action === 'suspend'
              ? 'gesperrt'
              : action === 'unsuspend'
                ? 'entsperrt'
                : 'bearbeitet'
      }`,

      data: {
        companyId,
        action,
        adminId: adminUserId,
        timestamp: now,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Interner Server-Fehler beim Aktualisieren des Freigabe-Status' },
      { status: 500 }
    );
  }
}
