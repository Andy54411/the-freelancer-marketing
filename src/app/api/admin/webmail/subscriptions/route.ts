/**
 * Admin API - Webmail Subscriptions
 * Uses Firebase Admin SDK for server-side access
 */

import { NextResponse } from 'next/server';
import { db } from '@/firebase/server';

export async function GET() {
  try {
    if (!db) {
      return NextResponse.json({
        success: false,
        error: 'Datenbank nicht verfuegbar',
      }, { status: 500 });
    }

    const snapshot = await db.collection('webmailSubscriptions').get();
    
    const subscriptions = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        currentPeriodStart: data.currentPeriodStart?.toDate?.()?.toISOString(),
        currentPeriodEnd: data.currentPeriodEnd?.toDate?.()?.toISOString(),
        nextBillingDate: data.nextBillingDate?.toDate?.()?.toISOString(),
        createdAt: data.createdAt?.toDate?.()?.toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString(),
        cancelledAt: data.cancelledAt?.toDate?.()?.toISOString(),
      };
    });
    
    return NextResponse.json({
      success: true,
      subscriptions,
      count: subscriptions.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return NextResponse.json({
      success: false,
      error: message,
    }, { status: 500 });
  }
}
