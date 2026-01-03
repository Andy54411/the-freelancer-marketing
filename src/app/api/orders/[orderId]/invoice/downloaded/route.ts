import { NextRequest, NextResponse } from 'next/server';
import { auth, db } from '@/firebase/server';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    
    // Auth prüfen
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    
    if (!auth || !db) {
      return NextResponse.json({ error: 'Firebase nicht verfügbar' }, { status: 500 });
    }
    
    const decodedToken = await auth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // Auftrag laden
    const orderRef = db.collection('auftraege').doc(orderId);
    const orderDoc = await orderRef.get();

    if (!orderDoc.exists) {
      return NextResponse.json({ error: 'Auftrag nicht gefunden' }, { status: 404 });
    }

    const orderData = orderDoc.data();
    
    // Prüfen ob User der Kunde ist
    if (orderData?.customerId !== userId && orderData?.customerFirebaseUid !== userId) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
    }

    // Download-Status aktualisieren
    await orderRef.update({
      'invoice.status': 'downloaded',
      'invoice.downloadedAt': FieldValue.serverTimestamp(),
      'invoice.downloadedBy': userId,
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Download-Status aktualisiert' 
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
