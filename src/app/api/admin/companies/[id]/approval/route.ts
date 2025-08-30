import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';
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
    const adminToken = cookieStore.get('taskilo-admin-token')?.value;

    if (adminToken) {
      try {
        const { payload } = await jwtVerify(adminToken, JWT_SECRET);
        const decoded = payload as any;
        if (decoded.role === 'admin') {
          return { isValid: true, userId: decoded.userId };
        }
      } catch (error) {
        console.error('JWT verification failed:', error);
      }
    }
  } catch (error) {
    console.error('Admin auth verification error:', error);
  }

  return { isValid: false, error: 'Keine gültige Admin-Authentifizierung gefunden' };
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Verify admin authentication
    const authResult = await verifyAdminAuth(request);
    if (!authResult.isValid) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const { id: companyId } = await params;
    const body = await request.json();
    const { action, notes, adminId } = body;

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Ungültige Aktion. Erlaubt: approve, reject' },
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
      if (notes) {
        updateData.adminNotes = notes;
      }
    } else if (action === 'reject') {
      updateData.adminApproved = false;
      updateData.adminApprovedAt = null;
      updateData.adminApprovedBy = null;
      updateData.approvalStatus = 'rejected';
      updateData.adminNotes = notes || 'Keine Begründung angegeben';
    }

    // Update in Firebase
    await db.collection('companies').doc(companyId).update(updateData);

    // Log admin action for audit trail
    await db.collection('admin_logs').add({
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
      const notificationType = action === 'approve' ? 'approval_granted' : 'approval_rejected';

      const notificationResponse = await fetch(
        `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/company/${companyId}/notifications/approval`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: notificationType,
            status: 'unread',
            adminNotes: notes,
            adminApprovedBy: adminUserId,
          }),
        }
      );

      if (!notificationResponse.ok) {
        console.error('Failed to send notification to company');
      }
    } catch (notificationError) {
      console.error('Error sending notification:', notificationError);
      // Don't fail the approval process if notification fails
    }

    return NextResponse.json({
      success: true,
      message: `Unternehmen wurde erfolgreich ${action === 'approve' ? 'freigegeben' : 'abgelehnt'}`,
      data: {
        companyId,
        action,
        adminId: adminUserId,
        timestamp: now,
      },
    });
  } catch (error) {
    console.error('Error updating company approval status:', error);
    return NextResponse.json(
      { error: 'Interner Server-Fehler beim Aktualisieren des Freigabe-Status' },
      { status: 500 }
    );
  }
}
