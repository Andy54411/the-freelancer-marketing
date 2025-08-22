import { NextResponse } from 'next/server';
import { db } from '../../../firebase/server';

export async function POST() {
  try {
    console.log('[migrate-orders] Starte Migration von orders → auftraege...');

    // Hole alle Orders aus der 'orders' Collection
    const ordersSnapshot = await db.collection('orders').get();

    if (ordersSnapshot.empty) {
      return NextResponse.json({
        success: true,
        message: 'Keine Orders in orders Collection gefunden',
        migrated: 0,
      });
    }

    const batch = db.batch();
    let migrated = 0;

    ordersSnapshot.forEach(doc => {
      const orderData = doc.data();
      const orderId = doc.id;

      console.log(`[migrate-orders] Migriere Order ${orderId}`);

      // Füge zur auftraege Collection hinzu
      const auftraegeRef = db.collection('auftraege').doc(orderId);
      batch.set(auftraegeRef, orderData);

      // Lösche aus orders Collection
      batch.delete(doc.ref);

      migrated++;
    });

    // Führe die Migration aus
    await batch.commit();

    console.log(`[migrate-orders] Migration abgeschlossen: ${migrated} Orders migriert`);

    return NextResponse.json({
      success: true,
      message: `${migrated} Orders erfolgreich von orders → auftraege migriert`,
      migrated,
    });
  } catch (error) {
    console.error('[migrate-orders] Fehler:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
