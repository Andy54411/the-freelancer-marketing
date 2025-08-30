import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';

/**
 * POST /api/company/[uid]/notifications/[notificationId]/read
 * Marks a notification as read
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string; notificationId: string }> }
) {
  try {
    const { uid, notificationId } = await params;

    if (!uid || !notificationId) {
      return NextResponse.json(
        { error: 'Company ID und Notification ID sind erforderlich' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    // Update notification as read
    await db.collection('notifications').doc(notificationId).update({
      readAt: now,
      status: 'read',
    });

    return NextResponse.json({
      success: true,
      message: 'Benachrichtigung als gelesen markiert',
      data: {
        notificationId,
        readAt: now,
      },
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return NextResponse.json(
      {
        error: 'Fehler beim Markieren der Benachrichtigung',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
