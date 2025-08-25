import { NextResponse } from 'next/server';
import { db } from '../../../firebase/server';

export async function POST() {
  try {

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

      // Füge zur auftraege Collection hinzu
      const auftraegeRef = db.collection('auftraege').doc(orderId);
      batch.set(auftraegeRef, orderData);

      // Lösche aus orders Collection
      batch.delete(doc.ref);

      migrated++;
    });

    // Führe die Migration aus
    await batch.commit();

    return NextResponse.json({
      success: true,
      message: `${migrated} Orders erfolgreich von orders → auftraege migriert`,
      migrated,
    });
  } catch (error) {

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
