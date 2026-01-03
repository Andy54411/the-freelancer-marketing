import { NextRequest, NextResponse } from 'next/server';
import { auth, db, storage } from '@/firebase/server';
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
    
    if (!auth || !db || !storage) {
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
    
    // Prüfen ob User der Anbieter ist
    if (orderData?.providerId !== userId && orderData?.selectedAnbieterId !== userId) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
    }

    // FormData parsen
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'Keine Datei hochgeladen' }, { status: 400 });
    }

    // Datei-Validierung
    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Nur PDF-Dateien erlaubt' }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Datei zu groß (max. 10MB)' }, { status: 400 });
    }

    // Datei in Firebase Storage hochladen
    const bucket = storage.bucket();
    const fileName = `invoices/${orderId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    const fileRef = bucket.file(fileName);
    await fileRef.save(fileBuffer, {
      metadata: {
        contentType: 'application/pdf',
        metadata: {
          orderId,
          uploadedBy: userId,
          originalName: file.name,
        },
      },
    });

    // Signierte URL für Download generieren (gültig für 7 Tage)
    const [signedUrl] = await fileRef.getSignedUrl({
      action: 'read',
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 Tage
    });

    // Auftrag mit Rechnungsdaten aktualisieren
    await orderRef.update({
      invoice: {
        status: 'uploaded',
        uploadedAt: FieldValue.serverTimestamp(),
        uploadedBy: userId,
        invoiceUrl: signedUrl,
        invoiceFileName: file.name,
        storagePath: fileName,
      },
    });

    // TODO: Benachrichtigung an Kunden senden

    return NextResponse.json({ 
      success: true, 
      invoiceUrl: signedUrl,
      message: 'Rechnung wurde hochgeladen' 
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
