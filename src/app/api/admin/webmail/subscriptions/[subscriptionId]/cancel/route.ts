/**
 * Admin API - Cancel Subscription
 * Uses Firebase Admin SDK for server-side access
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ subscriptionId: string }> }
) {
  try {
    if (!db) {
      return NextResponse.json({
        success: false,
        error: 'Datenbank nicht verfuegbar',
      }, { status: 500 });
    }

    const { subscriptionId } = await params;
    const body = await request.json().catch(() => ({}));
    
    await db.collection('webmailSubscriptions').doc(subscriptionId).update({
      status: 'cancelled',
      cancelledAt: FieldValue.serverTimestamp(),
      cancelReason: body.reason || 'Vom Admin gekuendigt',
      updatedAt: FieldValue.serverTimestamp(),
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return NextResponse.json({
      success: false,
      error: message,
    }, { status: 500 });
  }
}
