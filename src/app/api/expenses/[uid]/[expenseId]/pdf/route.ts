import { NextRequest, NextResponse } from 'next/server';
import { storage, auth, admin } from '@/firebase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { uid: string; expenseId: string } }
) {
  try {
    const { uid, expenseId } = params;

    // 1. AUTH: Session-basierte Authentifizierung über Cookie
    const sessionCookie = request.cookies.get('session')?.value;

    if (!sessionCookie) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (!auth) {
      return NextResponse.json({ error: 'Auth not available' }, { status: 500 });
    }

    let decodedClaims;
    try {
      decodedClaims = await auth.verifySessionCookie(sessionCookie);
    } catch (error) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    // 2. AUTHORIZATION: Prüfe ob User Zugriff auf diese Company hat
    if (decodedClaims.uid !== uid) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // 3. VALIDATE EXPENSE: Lade Expense-Dokument aus Firestore
    if (!admin.firestore) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    const db = admin.firestore();
    const expenseRef = db.collection('companies').doc(uid).collection('expenses').doc(expenseId);
    const expenseSnap = await expenseRef.get();

    if (!expenseSnap.exists) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    const expenseData = expenseSnap.data();
    const receiptUrl = expenseData?.receipt?.downloadURL;

    if (!receiptUrl) {
      return NextResponse.json({ error: 'No receipt found' }, { status: 404 });
    }

    // 4. SAFE STORAGE ACCESS: Verwende Admin-Berechtigung für Storage
    if (!storage) {
      return NextResponse.json({ error: 'Storage not available' }, { status: 500 });
    }

    try {
      // Extrahiere Storage-Pfad
      const match = receiptUrl.match(/\/o\/(.+?)\?/);
      if (!match || !match[1]) {
        return NextResponse.json({ error: 'Invalid receipt URL' }, { status: 400 });
      }

      let storagePath = decodeURIComponent(match[1]);
      if (storagePath.includes('%')) {
        storagePath = decodeURIComponent(storagePath);
      }

      // Validiere dass es ein Company-Expense ist
      if (
        !storagePath.startsWith(`companies/${uid}/expenses/`) &&
        !storagePath.startsWith(`expense-receipts/${uid}/`)
      ) {
        // Legacy support
        return NextResponse.json({ error: 'Invalid file path' }, { status: 403 });
      }

      const bucket = storage.bucket();
      const file = bucket.file(storagePath);

      const [exists] = await file.exists();
      if (!exists) {
        return NextResponse.json({ error: 'File not found' }, { status: 404 });
      }

      // Generiere signierte URL
      const [signedUrl] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + 5 * 60 * 1000, // Nur 5 Minuten gültig
      });

      // Lade und liefere PDF aus
      const response = await fetch(signedUrl);

      if (!response.ok) {
        return NextResponse.json({ error: 'Failed to fetch PDF' }, { status: 500 });
      }

      const pdfBuffer = await response.arrayBuffer();

      return new NextResponse(pdfBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'inline',
          'Cache-Control': 'private, max-age=300', // 5 Minuten Cache
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'SAMEORIGIN',
        },
      });
    } catch (storageError) {
      return NextResponse.json({ error: 'Storage access failed' }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
