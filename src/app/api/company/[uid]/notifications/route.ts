import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';

/**
 * GET /api/company/[uid]/notifications
 * Loads notifications for a company, optionally filtered by type
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
  try {
    const { uid } = await params;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    if (!uid) {
      return NextResponse.json({ error: 'Company ID ist erforderlich' }, { status: 400 });
    }

    // Build query for notifications
    let query = db.collection('notifications').where('companyId', '==', uid);

    // Filter by type if provided (without ordering to avoid index requirement)
    if (type) {
      query = query.where('type', '==', type);
    }

    // Limit to recent notifications (without ordering to avoid index requirement)
    query = query.limit(50);

    const notificationsSnapshot = await query.get();

    let notifications = notificationsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt || new Date().toISOString(),
    }));

    // Sort manually by createdAt (newest first)
    notifications = notifications.sort((a, b) => {
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);
      return dateB.getTime() - dateA.getTime();
    });

    return NextResponse.json({
      success: true,
      notifications,
      count: notifications.length,
    });
  } catch (error) {
    console.error('Error loading notifications:', error);
    return NextResponse.json(
      {
        error: 'Fehler beim Laden der Benachrichtigungen',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
