import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: { deliveryNoteId: string } }
) {
  try {
    const deliveryNoteId = params.deliveryNoteId;

    if (!deliveryNoteId) {
      return NextResponse.json({ error: 'Lieferschein-ID ist erforderlich' }, { status: 400 });
    }

    // Verwende Firebase Admin SDK für server-seitigen Zugriff
    const docRef = db!.collection('deliveryNotes').doc(deliveryNoteId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: 'Lieferschein nicht gefunden' }, { status: 404 });
    }

    const data = docSnap.data()!;
    const deliveryNote = {
      id: docSnap.id,
      ...data,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      sentAt: data.sentAt?.toDate(),
      deliveredAt: data.deliveredAt?.toDate(),
      invoicedAt: data.invoicedAt?.toDate(),
    };

    // Lade Firmendaten für das Template
    let companyData: Record<string, unknown> = {};
    if (data.companyId) {
      try {
        // Versuche erst companies Collection
        const companyDoc = await db!.collection('companies').doc(data.companyId).get();
        if (companyDoc.exists) {
          companyData = companyDoc.data()!;
        } else {
          // Fallback: users Collection
          const userDoc = await db!.collection('users').doc(data.companyId).get();
          if (userDoc.exists) {
            companyData = userDoc.data()!;
          }
        }

      } catch {}
    }

    return NextResponse.json({
      deliveryNote,
      companyData,
      success: true,
    });
  } catch {
    return NextResponse.json({ error: 'Fehler beim Laden des Lieferscheins' }, { status: 500 });
  }
}
