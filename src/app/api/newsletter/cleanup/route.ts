import { NextRequest, NextResponse } from 'next/server';
import { cleanupExpiredPendingConfirmations } from '@/lib/newsletter-double-opt-in';
import { admin } from '@/firebase/server';

// Cleanup-Endpunkt für abgelaufene Newsletter-Bestätigungen
// Sollte regelmäßig über Cron oder manuell aufgerufen werden
export async function POST(request: NextRequest) {
  try {
    // Optionale API-Key Validierung für Sicherheit
    const apiKey = request.headers.get('x-api-key');
    const expectedApiKey = process.env.CLEANUP_API_KEY;

    if (expectedApiKey && apiKey !== expectedApiKey) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await cleanupExpiredPendingConfirmations();

    return NextResponse.json({
      success: true,
      message: `${result.deletedCount} abgelaufene Newsletter-Bestätigungen gelöscht`,
      deletedCount: result.deletedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {

    return NextResponse.json({ error: 'Fehler beim Cleanup' }, { status: 500 });
  }
}

// GET für manuelle Überprüfung
export async function GET(_request: NextRequest) {
  try {
    // Zähle pending confirmations
    const totalPending = await admin.firestore().collection('newsletterPendingConfirmations').get();

    // Zähle abgelaufene
    const now = admin.firestore.Timestamp.now();
    const expiredPending = await admin
      .firestore()
      .collection('newsletterPendingConfirmations')
      .where('expiresAt', '<=', now)
      .get();

    return NextResponse.json({
      totalPendingConfirmations: totalPending.size,
      expiredConfirmations: expiredPending.size,
      activeConfirmations: totalPending.size - expiredPending.size,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {

    return NextResponse.json({ error: 'Fehler beim Abrufen der Statistiken' }, { status: 500 });
  }
}
