import { NextResponse } from 'next/server';
import { storage, admin } from '@/firebase/server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ uid: string; expenseId: string }> }
) {
  try {
    const { uid, expenseId } = await params;

    // 1. VALIDATE EXPENSE: Lade Expense-Dokument aus Firestore
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

    console.log('📄 Expense data:', { uid, expenseId, receiptUrl });

    if (!receiptUrl) {
      return NextResponse.json({ error: 'No receipt found' }, { status: 404 });
    }

    // 2. SAFE STORAGE ACCESS: Verwende Admin-Berechtigung für Storage
    if (!storage) {
      return NextResponse.json({ error: 'Storage not available' }, { status: 500 });
    }

    try {
      // Die URL ist bereits eine signierte URL - gib sie direkt zurück
      if (receiptUrl.includes('GoogleAccessId=') || receiptUrl.includes('X-Goog-')) {
        console.log('✅ URL is already signed, returning directly');
        return NextResponse.json({
          success: true,
          url: receiptUrl,
          expiresIn: 3600,
        });
      }

      // Extrahiere Storage-Pfad für alte Firebase URLs
      let storagePath: string;

      // Neues Format: storage.googleapis.com/bucket-name/path/to/file.pdf?...
      const newFormatMatch = receiptUrl.match(/googleapis\.com\/[^\/]+\/(.+?)(\?|$)/);

      // Altes Format: /o/encoded-path?...
      const oldFormatMatch = receiptUrl.match(/\/o\/(.+?)\?/);

      console.log('🔍 URL parsing:', {
        receiptUrl,
        newFormatMatch: newFormatMatch?.[1],
        oldFormatMatch: oldFormatMatch?.[1],
      });

      if (newFormatMatch && newFormatMatch[1]) {
        storagePath = decodeURIComponent(newFormatMatch[1]);
      } else if (oldFormatMatch && oldFormatMatch[1]) {
        storagePath = decodeURIComponent(oldFormatMatch[1]);
      } else {
        return NextResponse.json(
          {
            error: 'Invalid receipt URL',
            details: `URL format not recognized: ${receiptUrl}`,
          },
          { status: 400 }
        );
      }

      // Doppelte URL-Dekodierung falls nötig
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
        expires: Date.now() + 60 * 60 * 1000, // 60 Minuten gültig
      });

      console.log('✅ Generated signed URL');

      // Gib die signierte URL als JSON zurück
      return NextResponse.json({
        success: true,
        url: signedUrl,
        expiresIn: 3600,
      });
    } catch {
      return NextResponse.json({ error: 'Storage access failed' }, { status: 500 });
    }
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
